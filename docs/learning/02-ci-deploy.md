# 02 — CI deploy to GitHub Pages

## What we built
- `.github/workflows/deploy.yml`: one workflow with two jobs. `build` installs, tests, typechecks and builds; `deploy` publishes `dist/` to GitHub Pages.
- `astro.config.mjs` now sets `site: "https://mlhv.github.io"`. Astro uses it to make absolute URLs (sitemap, canonical links). No `base`, because this is a user site served from the domain root (ADR 0002).
- Every push to `main` runs the full pipeline and deploys. Every pull request runs `build` only, so its checks go red or green without touching the live site.
- The pipeline runs the same npm scripts you run locally (`npm test`, `npm run typecheck`, `npm run build`), so "green in CI" means "green on my machine from a clean install".

## Key concepts

### GitHub Actions anatomy: workflow → jobs → steps
A workflow is one YAML file under `.github/workflows/`. It contains jobs, and each job runs on its own fresh virtual machine (`runs-on: ubuntu-latest`). Jobs run in parallel unless one declares `needs:`. Steps run in order inside a job, and a failing step stops that job. In `deploy.yml`, `deploy` has `needs: build`, so it starts only after `build` succeeds.

### `uses` vs `run`
`uses:` calls a packaged action, a reusable step published by someone else, pinned to a version tag (`actions/checkout@v7`). `run:` executes a shell command on the runner. The `build` job mixes both: `uses` for checkout, Node setup and artifact upload, `run` for the npm scripts.

### Triggers: `push`, `pull_request`, `workflow_dispatch`
- `push` with `branches: [main]` is the deploy trigger.
- `pull_request` runs the workflow for PRs. Each job or step can be skipped with an `if:`. Here `if: github.event_name != 'pull_request'` skips the upload and the whole `deploy` job for PRs, so PR checks never publish anything.
- `workflow_dispatch` adds a "Run workflow" button in the Actions tab, so you can re-run a deploy without a new commit.

### `npm ci` vs `npm install`
`npm ci` deletes `node_modules`, then installs exactly what `package-lock.json` records, and fails if the lockfile and `package.json` disagree. `npm install` may update the lockfile. CI uses `npm ci` so a build always uses the dependency versions you committed. The `cache: npm` option in `setup-node` caches the download step, keyed on the lockfile.

### Pages artifact and `deploy-pages` (OIDC)
The flow has two steps. `upload-pages-artifact` packs `dist/` into a tarball and stores it on the run. `deploy-pages` takes that artifact and publishes it to the `github-pages` environment. The permissions are the reason it works:
- `pages: write` lets the job create a deployment on the Pages site.
- `id-token: write` lets the job request an OIDC token. GitHub checks the token, so the deploy step needs no stored password or deploy key. The identity is the workflow itself.
- `contents: read` is the minimum for checking out the code.

### `concurrency`
`group: pages` with `cancel-in-progress: false` means only one Pages deployment runs at a time. If two pushes land close together, the second waits for the first to finish instead of killing it halfway. Cancelling a deploy could leave the site in a mixed state, so we queue instead of cancel.

### Why tests and typecheck gate the deploy
`deploy` needs `build`, and `build` runs `npm test` and `npm run typecheck` before `npm run build`. A failing test or type error stops the job before the artifact is uploaded, so broken code never reaches the live site. The gate costs a few seconds of CI time and saves a broken deploy.

### User site vs project site (`base`)
A GitHub Pages site is either a user site (`mlhv.github.io`, served from the root of the domain) or a project site (`mlhv.github.io/repo-name/`, served from a subpath). A project site needs `base: "/repo-name"` in the Astro config, otherwise every asset URL is wrong. We use the user site, so we set `site` and leave `base` out.

## Why it's done this way
The build and the deploy are separate jobs so that PRs get the same checks as `main` without any way to publish. OIDC avoids storing a secret for the deploy. Tests and typecheck run in CI, not only locally, because a local run can be skipped. `npm ci` makes the CI build match the lockfile exactly.

## Try it yourself
Exercise: break a test on a throwaway branch, open a PR, and watch the `build` job fail while nothing deploys.

Hint: change an expected value in the existing test file, commit to a new branch, push it, and open a PR with `gh pr create`. Do not merge the PR.

Check: the PR's checks are red, the `build` job fails at `npm test`, and the `deploy` job is skipped. The live site at `https://mlhv.github.io` is unchanged. Close the PR and delete the branch afterwards.

## Interview angle
PRs get the same tests, typecheck and build as `main`, but only pushes to `main` can publish, and the deploy uses OIDC instead of a stored secret. Because this is a user site, the only config it needs is `site`, not `base`.
