# 03 — Résumé sync

## What we built
- `scripts/sync-resume.ts`: a CLI that reads the master résumé `.tex` and writes `src/data/resume.json` and a phone-free `public/resume.pdf`.
- `src/lib/resume-data.ts`: the one typed entry point (`resume: SiteResume`) that pages import instead of the JSON.
- `npm run sync-resume [-- --seed-projects]`, configurable with `RESUME_DIR` and `RESUME_TEX`.
- ADR 0003 records why the résumé repo is the source of truth, and `CONTEXT.md` gains the **Resume** term.
- Generated files are committed, so CI and the deploy never need the résumé repo.

## Key concepts

### Functional core, imperative shell
All the logic that can be wrong (parsing, phone stripping, seed markdown) lives in `src/lib/resume.ts` as pure functions: string in, data out, no disk. `scripts/sync-resume.ts` is the thin shell that does the I/O: read a file, call the core, write files, run `tectonic`. The core is tested without touching the file system, and the shell is too small to hide many bugs.

### A small reader instead of regex alone
LaTeX arguments nest braces (`\textbf{a \textit{b}}`), which a regex cannot match reliably. `readArgs` in `src/lib/resume.ts` walks the text counting `{` and `}` to find where an argument really ends. Regexes still find the commands; the reader handles the arguments.

### Fixture-based tests against real data
`src/lib/resume.test.ts` imports a real résumé fixture with `import fixture from './__fixtures__/master-resume.tex?raw'`. Vite's `?raw` suffix imports a file as a plain string. Testing against the real résumé catches the formatting quirks a hand-written sample would miss.

### Node native TypeScript
Node runs `.ts` files directly by stripping the type annotations (no compile step). That is why `scripts/sync-resume.ts` imports `'../src/lib/resume.ts'` with the extension: Node does not guess extensions. Type stripping only removes types, so syntax that needs real transformation (like enums) is off limits. `npm run typecheck` still checks the script.

### Failing loudly on input drift
`parseResume` throws if the résumé no longer matches the expected template, and it runs before anything is written. A loud failure is better than a quietly half-empty site. The script also refuses to build the PDF if a phone number survives stripping.

### Generated-and-committed artifacts
`resume.json` and `resume.pdf` are outputs, never hand-edited, but they are committed. The deploy then depends only on this repo, and a diff after each sync shows exactly what changed.

### Idempotent seeding
`--seed-projects` only creates project files that are missing and never overwrites existing ones. Running it twice is the same as running it once, and deleting a project file keeps it deleted unless you pass the flag.

## Why it's done this way
The résumé is already maintained for job applications, so a second hand-written copy would drift (ADR 0003). The résumé repo also holds private job-tracking data, so CI cannot read it; syncing locally and committing the output keeps the deploy self-contained. Projects are seeded once and then owned here because each needs a logo and write-up the résumé cannot hold.

## Try it yourself
Add an optional `website` field to `Contact`, read from any `\href` in the heading that is not a mailto, LinkedIn or GitHub link.

Hint: TDD it in `src/lib/resume.test.ts` with an inline heading string, so you do not need to edit the real résumé.

Check: `npm test` passes, and `npm run sync-resume` leaves `src/data/resume.json` unchanged for the current résumé (`git diff` is empty).

## Interview angle
I separated a pure, tested parser from a thin I/O script, and made the script fail loudly on template drift and refuse to publish if private data (a phone number) slips through. The generated outputs are committed so the deploy has no dependency on a private repo.
