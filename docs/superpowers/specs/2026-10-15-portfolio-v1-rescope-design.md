# Portfolio v1 re-scope — design

Supersedes the collaboration split in issue #1 ("Further Notes": scaffolding by Claude, components/styling/logic by hand). Feature scope from #1 is otherwise unchanged.

## Intent

- **Outcome:** `mlhv.github.io` live and recruiter-ready before the 2027 internship recruiting cycle.
- **What changes:** Claude implements every step. The owner's ongoing manual work shrinks to (a) editing the master resume as today and running one sync command, and (b) curating Project files and writing Blog Posts at will.
- **Learning:** every step ends with a committed explainer at `docs/learning/NN-<step>.md`.
- **Unchanged constraints:** Astro + vanilla TypeScript, no UI framework (ADR 0001); GitHub Pages user site via Actions (ADR 0002); scoped `<style>` + CSS custom properties; WCAG AA; Silkscreen (headings/chrome) + Atkinson Hyperlegible (body); cream / dark-roast / taro-purple palette (already in `src/styles/theme.css`).

## v1 scope

Desktop homepage, Projects (grid + per-project pages), Work Experience, `/resume` page + PDF, Contact, Blog (infrastructure + empty state, no posts), light/dark toggle, CI deploy.

## Source of truth: the resume repo

`~/Desktop/resume/sources/master-resume.tex` is canonical for contact links, education, skills, and work experience (new ADR 0003).

### Sync script

`npm run sync-resume` → `node scripts/sync-resume.ts` (Node ≥22.18 strips TS types natively; no new dependency). Bump `package.json` `engines.node` to `>=22.18.0`; local is Node 25, CI pins Node 24.

- Resume repo path: `RESUME_DIR` env var, default `~/Desktop/resume`.
- Parsing lives in a pure function `parseResume(tex: string): Resume` in `src/lib/resume.ts`, with no filesystem access. It reads the fixed Jake's-Resume macros: the `\begin{center}` heading block, `\section{...}`, `\resumeSubheading{4 args}`, `\resumeProjectHeading{name | stack}{}`, `\resumeItem{...}`, and the `\textbf{Label}{: a, b}` skill lines. LaTeX comment lines (`%...`) are ignored.
- LaTeX → plain text cleanup: strip `\textbf{}`/`\emph{}`/`\textit{}`/`\href{url}{text}` wrappers to their text, `\%`→`%`, `\&`→`&`, `\$`→`$`, `$\sim$`→`~`, `$|$`→`|`, `--`→`–`, `\\`/extra whitespace collapsed.
- **Phone number is dropped**: not included in `resume.json`.

### Outputs (all committed; CI never reads the resume repo)

1. `src/data/resume.json`: `{ name, contact: { email, linkedin, github }, education[], skills: { label, items[] }[], experience[] }` where each experience entry is `{ company, role, location, startDate, endDate, highlights[] }` (dates kept as the resume's display strings, e.g. `"Mar 2026"`, plus the order they appear in). It starts with a `"_generated"` note and is never hand-edited.
2. `public/resume.pdf`: the sync copies the `.tex` to a temp dir, removes the phone number and its `$|$` separator from the heading line, and builds with `tectonic`. If tectonic is missing, it warns and skips the PDF; the JSON is still written.
3. `src/content/projects/<slug>.md`: **seeded only when the file does not already exist.** Existing project files are never overwritten. Seed = title, description (first bullet), techStack (from the `| stack` part), body (all bullets), `featured: false`.

Script output reports what changed (experience count, new project seeds, PDF built/skipped).

## Content model

- **Project** (Content Collection, `src/content/projects/*.md`): `title`, `description`, `techStack: string[]`, `repoUrl?`, `liveUrl?`, `logo?` (image), `featured: boolean`, `date?`, `order?`. Free-form Markdown body. Adding a project = copy a file, fill frontmatter, write the body.
- **Post** (Content Collection, `src/content/blog/*.md`): `title`, `description`, `date`, `tags: string[]`, `draft: boolean`. Ships with zero entries.
- **Resume data** (`src/data/resume.json`): typed via a `Resume` TypeScript type exported from `src/lib/resume.ts`. Replaces the hand-authored `WorkExperienceEntry` file from #1.

`coverImage` from #1 becomes optional `logo`, since the owner wants a per-project logo.

## Pages

| Route | Content |
|---|---|
| `/` | Desktop: 4 static Windows (Projects, Work Experience, Blog, Contact) linking to their pages; single column below 768px. |
| `/projects` | Grid of window-styled "screens", featured first, then by `order`/`date`. |
| `/projects/[slug]` | Per-project page: logo, stack, links, rendered Markdown body. |
| `/work` | Stacked cards from `resume.json` experience, in resume order (already reverse-chronological), plus links to `/resume` and the PDF. |
| `/resume` | Plain single column: education, skills, experience from `resume.json`; heading font + color tokens only; PDF download link. Not in Nav. |
| `/contact` | `mailto:`, LinkedIn, GitHub (from `resume.json`), links to `/resume` and PDF. No form. |
| `/blog` | Non-draft posts, reverse-chronological, tag filter; "Posts coming soon" empty state when none. |
| `/blog/[slug]` | Post page (non-drafts only in production). |

Nav: Home, Projects, Work Experience, Blog, Contact (unchanged).

## Testing

Vitest unit tests for pure functions only:
- `resolveTheme` (exists).
- `parseResume`: run against a fixture copy of the real `master-resume.tex` (phone removed), asserting contact, 3 experience entries with correct fields, skill groups, project list, LaTeX cleanup cases, and that no phone number appears in the output.
- `filterPostsByTag`: matching tag, no matches, no tag selected (returns all).

`astro check` + Zod schemas validate content at build time. CI runs `npm test`, `astro check`, `astro build`; any failure blocks deploy.

## Build order

Each step ends with a commit and `docs/learning/NN-<step>.md` covering what was built, the key concepts, why it's done this way, and a "try it yourself" exercise.

1. **Shell & theme:** commit existing WIP, finish tokens/typography/toggle (closes #2).
2. **CI deploy:** GitHub Actions → Pages; stubs live at `mlhv.github.io` (#3).
3. **Resume sync:** parser + tests + script + first sync (new).
4. **Work Experience, `/resume`, Contact** (#5, #8). Site is recruiter-usable from here.
5. **Projects:** collection, grid, per-project pages, seeded entries (#6).
6. **Desktop homepage** (#4).
7. **Blog:** collection, index, tag filter, empty state (#7).

## Housekeeping

- ADR 0003: resume repo is the source of truth; synced artifacts are committed, CI is independent of it.
- Update `CONTEXT.md`: Work Experience Entry sourced from resume sync; Resume page/PDF generated.
- GitHub issues: edit #1's Further Notes and #5's PDF/data-file criteria to match this spec; add a sub-issue for the resume sync. (Done only with the owner's go-ahead.)

## Out of scope (unchanged from #1 unless noted)

Draggable windows, comments, contact form, analytics, custom domain, CMS, UI frameworks, timeline layout, boot sequence/taskbar. New: CI-side resume sync, auto-publishing AI-drafted posts.
