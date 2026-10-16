# mlhv.github.io

Minh Le's portfolio and engineering blog, live at **https://mlhv.github.io**.

A static [Astro](https://astro.build) site with no UI framework: Astro components, vanilla TypeScript, and scoped CSS. Its pages are a Desktop-style homepage, Projects, Work Experience, a Résumé page with a PDF, a Blog, and Contact. It has a light/dark theme.

## Commands

Requires Node `>=22.18.0`.

| Command | What it does |
| :-- | :-- |
| `npm install` | Install dependencies |
| `astro dev --background` | Start the dev server in the background (`astro dev status` / `logs` / `stop` to manage it) |
| `npm test` | Run the unit tests (Vitest) |
| `npm run typecheck` | Type-check the site and scripts (`astro check`) |
| `npm run build` | Build the site to `dist/` |
| `npm run preview` | Serve the built site locally |
| `npm run sync-resume` | Regenerate `src/data/resume.json` and `public/resume.pdf` from the master résumé |

## Updating content

- **Résumé changed:** run `npm run sync-resume`, then commit `src/data/resume.json` and `public/resume.pdf` and push. It reads `~/Desktop/resume/sources/master-resume.tex` by default; override with `RESUME_DIR` / `RESUME_TEX`. A PDF build needs [tectonic](https://tectonic-typesetting.github.io) (`brew install tectonic`). The phone number is stripped from the PDF, and the sync refuses to build it if any phone-like number remains. Never edit the generated files by hand.
- **New or changed project:** add or edit a Markdown file in `src/content/projects/`, then push. If the project is already on your résumé, `npm run sync-resume -- --seed-projects` creates a starter file for it. Existing files are never overwritten, and a deleted file stays deleted.
- **New post:** add `src/content/blog/<slug>.md` with `draft: true`, preview it in dev, then flip it to `draft: false` and push. Drafts never appear in a production build.

The frontmatter fields for projects and posts are defined, and checked at build time, in `src/content.config.ts`.

## Deploys

Every push to `main` runs `.github/workflows/deploy.yml`, which tests, type-checks and builds the site, then deploys it to GitHub Pages. Pull requests run the same checks without deploying.

## Docs

- `CONTEXT.md`: domain vocabulary (Project, Post, Desktop, Window and so on)
- `docs/adr/`: architecture decisions (no UI framework, user site with no `base` path, the résumé repo as source of truth)
- `docs/learning/`: a write-up for each build step
- `docs/superpowers/`: the v1 spec and implementation plan
