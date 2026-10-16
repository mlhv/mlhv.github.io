# Portfolio v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `mlhv.github.io`: Desktop homepage, Projects, Work Experience, `/resume` + PDF, Contact, Blog, light/dark toggle. Résumé data is synced from `~/Desktop/resume`, and the site deploys automatically on push to `main`.

**Architecture:** Static Astro 7 site, no UI framework. A Node script parses `master-resume.tex` with a pure, unit-tested parser and writes `src/data/resume.json` and `public/resume.pdf`, both committed. Projects and Posts are Astro Content Collections (Markdown + Zod schemas). Interactivity (theme toggle, tag filter) is vanilla TS: a thin DOM layer wraps pure functions.

**Tech Stack:** Astro 7.2, TypeScript 6 (strict), Vitest 4, Zod (`astro/zod`), tectonic (local PDF build), GitHub Actions + Pages.

**Spec:** `docs/superpowers/specs/2026-10-15-portfolio-v1-rescope-design.md`

## Global Constraints

- No UI framework (React/Preact/Svelte/Vue). Pure Astro components + vanilla TypeScript (ADR 0001).
- Styling: scoped Astro `<style>` blocks + CSS custom properties in `src/styles/theme.css`. No CSS framework.
- Persona-style accents (diagonal `clip-path`, skew/rotate) only on chrome: Nav, page titles, Window title bars. Never on body text or Work Experience content.
- All text meets WCAG AA (≥4.5:1). The existing palette is verified; lowest pair is dark accent on dark surface at 4.92:1. Do not change token colors without re-checking.
- Body copy max-width ~70ch.
- Fonts: Silkscreen (`--font-heading`), Atkinson Hyperlegible (`--font-body`), already registered in `astro.config.mjs`.
- Node `>=22.18.0` (`engines`); scripts run as `.ts` via native type stripping. CI uses Node 24.
- **The phone number never appears** in `resume.json`, in any page, or in `public/resume.pdf`.
- `src/data/resume.json` and `public/resume.pdf` are generated. Never hand-edit them.
- `npm run sync-resume` never overwrites an existing `src/content/projects/*.md`.
- GitHub Pages *user* site at `https://mlhv.github.io`, no `base` path (ADR 0002).
- Every step (Tasks 1, 2, 4, 5, 6, 7, 8) ends with a learning doc `docs/learning/NN-<slug>.md` using the template in "Learning docs" below.
- Work on branch `portfolio-v1`. Merging to `main` / pushing / changing GitHub settings or issues **requires the owner's explicit go-ahead at that moment.**

## Review Focus

1. **Résumé template drift:** if `master-resume.tex` changes shape (renamed section, missing experience), the sync must fail loudly and not write an empty `resume.json` that blanks the site. Test: `parseResume` throws when the Experience section is missing (Task 3).
2. **Phone number leak via a different format** (`555.867.5309`, `555-867-5309`): stripped from the PDF source, and the sync refuses to build a PDF if any phone-like number remains. Tests in Task 3 cover each format, plus `containsPhone`.
3. **Draft posts leaking to production:** a `draft: true` post must not appear on `/blog`, the homepage count, or get a `/blog/<slug>/` page in `astro build` output. Verified with a throwaway draft in Task 7.
4. **Deleted project reappearing:** if the owner deletes a seeded project file, a plain `npm run sync-resume` must not recreate it. Seeding happens only with `--seed-projects` (a refinement of the spec, which said "seed when missing"; this way a delete is respected). Verified in Task 6.
5. **Unknown `?tag=` in the blog URL:** shows all posts rather than an empty list. Covered by the guard in the Task 7 client script and `filterPostsByTag` tests.

## Learning docs

Each learning doc lives at `docs/learning/NN-<slug>.md` and has exactly these sections. Write it after the task's code is done and verified, about real code in this repo (quote file paths and short snippets):

```markdown
# NN — <Title>

## What we built
<3–6 bullets: files created/changed and what each does>

## Key concepts
<one short subsection per concept listed in the task; explain it in plain words, then point at where it appears in this repo>

## Why it's done this way
<the decisions and trade-offs, including alternatives rejected>

## Try it yourself
<the exercise listed in the task, with a hint and how to check you got it right>

## Interview angle
<1–2 sentences the owner could say about this in an interview>
```

## File map

| File | Responsibility | Task |
|---|---|---|
| `src/styles/theme.css` | Tokens + global base styles, `.page-title`, `.tag-list`, skip link | 1 |
| `src/layouts/Layout.astro` | HTML shell, fonts, no-flash theme init, Nav, `<main>` | 1 |
| `src/components/Nav.astro` | 5 nav links with `aria-current`, theme toggle | 1 |
| `src/components/ThemeToggle.astro` | Toggle button + DOM/localStorage wrapper around `resolveTheme` | 1 |
| `astro.config.mjs` | Fonts (exists) + `site` | 2 |
| `.github/workflows/deploy.yml` | Test → typecheck → build → deploy Pages | 2 |
| `src/lib/resume.ts` | Pure: `parseResume`, `cleanLatex`, `stripPhone`, `containsPhone`, `publicPdfSource`, `projectSeedMarkdown`, `displayUrl`, types | 3 |
| `src/lib/__fixtures__/master-resume.tex` | Phone-free copy of the real résumé for tests | 3 |
| `scripts/sync-resume.ts` | I/O: read .tex, write JSON, build PDF, optionally seed projects | 4 |
| `src/data/resume.json` | Generated résumé data | 4 |
| `public/resume.pdf` | Generated phone-free PDF | 4 |
| `src/lib/resume-data.ts` | Typed accessor `resume: SiteResume` over the JSON | 4 |
| `src/pages/work.astro`, `resume.astro`, `contact.astro` | Résumé-driven pages | 5 |
| `src/lib/projects.ts` | Pure: `sortProjects`, `monogram` | 6 |
| `src/content.config.ts` | Collections: `projects` (Task 6), `blog` (Task 7) | 6, 7 |
| `src/components/Window.astro` | Retro window panel (optionally a link) | 6 |
| `src/components/ProjectLogo.astro` | Logo image or pixel monogram fallback | 6 |
| `src/pages/projects/index.astro`, `[slug].astro` | Projects grid + per-project page | 6 |
| `src/lib/blog.ts` | Pure: `filterPostsByTag`, `collectTags`, `sortPostsNewestFirst` | 7 |
| `src/lib/content.ts` | `getVisiblePosts()`: draft-aware collection query | 7 |
| `src/pages/blog/index.astro`, `[slug].astro` | Blog index with tag filter + post page | 7 |
| `src/pages/index.astro` | Desktop homepage | 8 |

`src/pages/projects.astro` and `src/pages/blog.astro` (current stubs) are **moved** to `projects/index.astro` and `blog/index.astro` in Tasks 6 and 7.

Task order note: Blog (Task 7) comes before the Desktop homepage (Task 8), because the homepage's Blog window shows the post count from `getVisiblePosts()`.

---

### Task 1: Site shell & theme (closes #2)

**Files:**
- Modify: `package.json` (engines)
- Modify: `src/styles/theme.css`
- Modify: `src/layouts/Layout.astro`
- Modify: `src/components/Nav.astro`
- Create: `src/components/ThemeToggle.astro`
- Modify: `src/pages/index.astro` (temporary stub)
- Delete: `src/components/Welcome.astro`, `src/assets/astro.svg`, `src/assets/background.svg`
- Create: `docs/learning/01-site-shell-and-theme.md`

**Interfaces:**
- Consumes: `resolveTheme(stored: 'light' | 'dark' | null, systemPrefersDark: boolean): 'light' | 'dark'` from `src/lib/theme.ts` (exists, tested).
- Produces: `Layout` props `{ title: string; description?: string }`. Global classes `.page-title`, `.tag-list`, `.tag`, `.muted`. localStorage key `"theme"`.

- [ ] **Step 1: Branch and commit the owner's existing WIP as-is**

```bash
git switch -c portfolio-v1
git add src/layouts/Layout.astro src/pages/index.astro src/assets/fonts src/components/Nav.astro src/lib src/pages/blog.astro src/pages/contact.astro src/pages/projects.astro src/pages/work.astro src/styles astro.config.mjs vitest.config.ts package.json package-lock.json
git status --short   # confirm nothing unexpected is left unstaged or staged
git commit -m "chore: commit in-progress shell (nav, stub pages, theme tokens, resolveTheme)"
git add docs/superpowers
git commit -m "docs: portfolio v1 re-scope spec and plan"
```

- [ ] **Step 2: Bump the Node engine floor**

In `package.json`, change `"node": ">=22.12.0"` to `"node": ">=22.18.0"`.

- [ ] **Step 3: Replace `src/styles/theme.css` with the full token + base stylesheet**

```css
:root {
    color-scheme: light;
    /* colors — light (default): boba/cream base, taro-purple accent */
    --color-background: #faf3e8;   /* cream page background */
    --color-surface: #f0e4d3;      /* Window panels, cards — a step off the page bg */
    --color-border: #d9c7ae;
    --color-foreground: #3b2a22;   /* dark-roast-brown body text */
    --color-muted: #6b5b4e;        /* secondary/quieter text */

    --color-accent: #6b4a8f;       /* taro purple */
    --color-on-accent: #ffffff;    /* text/icons sitting on an accent-filled surface */

    /* vars are generated by the <Font> components */
    --font-heading: var(--font-silkscreen);
    --font-body: var(--font-atkinson-hyperlegible);
}

@media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
        color-scheme: dark;
        --color-background: #2b1e18;
        --color-surface: #3a2a21;
        --color-border: #5c463a;
        --color-foreground: #f5e9da;
        --color-muted: #c9b8a8;

        --color-accent: #a98fd1;
        --color-on-accent: #2b1e18;
    }
}

:root[data-theme="dark"] {
    color-scheme: dark;
    --color-background: #2b1e18;
    --color-surface: #3a2a21;
    --color-border: #5c463a;
    --color-foreground: #f5e9da;
    --color-muted: #c9b8a8;

    --color-accent: #a98fd1;
    --color-on-accent: #2b1e18;
}

*, *::before, *::after {
    box-sizing: border-box;
}

body {
    margin: 0;
    min-height: 100vh;
    background: var(--color-background);
    color: var(--color-foreground);
    font-family: var(--font-body);
    font-size: 1.0625rem;
    line-height: 1.6;
}

h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-heading);
    line-height: 1.25;
    letter-spacing: 0.02em;
}

main {
    width: min(100% - 2rem, 72rem);
    margin-inline: auto;
    padding-block: 2rem 4rem;
}

p, li {
    max-width: 70ch;
}

a {
    color: var(--color-accent);
    text-underline-offset: 0.15em;
}

:focus-visible {
    outline: 3px solid var(--color-accent);
    outline-offset: 2px;
}

.muted {
    color: var(--color-muted);
}

/* Persona-style accent: chrome only (page titles), never body copy. */
.page-title {
    display: inline-block;
    margin: 0 0 1.5rem;
    padding: 0.3rem 1.6rem 0.3rem 0.8rem;
    font-size: clamp(1.6rem, 5vw, 2.6rem);
    background: var(--color-accent);
    color: var(--color-on-accent);
    clip-path: polygon(0 0, 100% 0, calc(100% - 1rem) 100%, 0 100%);
    transform: rotate(-1.5deg);
}

.tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin: 0;
    padding: 0;
    list-style: none;
}

.tag {
    padding: 0.1rem 0.5rem;
    font-size: 0.8rem;
    border: 2px solid var(--color-border);
    background: var(--color-background);
    color: var(--color-foreground);
}

.skip-link {
    position: absolute;
    left: -999px;
    top: 0;
}

.skip-link:focus {
    left: 1rem;
    top: 1rem;
    z-index: 10;
    padding: 0.5rem 1rem;
    background: var(--color-accent);
    color: var(--color-on-accent);
}

@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        transition: none !important;
    }
}
```

- [ ] **Step 4: Replace `src/layouts/Layout.astro`**

This moves the `<Font>` tags from the homepage body into `<head>`, so fonts load on every page, not just `/`.

```astro
---
import "../styles/theme.css";
import { Font } from "astro:assets";
import Nav from "../components/Nav.astro";

interface Props {
	title: string;
	description?: string;
}

const {
	title,
	description = "Minh Le: software engineering projects, experience, and writing.",
} = Astro.props;
const pageTitle = title === "Home" ? "Minh Le" : `${title} · Minh Le`;
---

<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<meta name="description" content={description} />
		<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
		<link rel="icon" href="/favicon.ico" />
		<meta name="generator" content={Astro.generator} />
		<Font cssVariable="--font-silkscreen" preload />
		<Font cssVariable="--font-atkinson-hyperlegible" preload />
		<title>{pageTitle}</title>
		<script is:inline>
			// Runs before first paint so a stored theme choice never flashes the wrong palette.
			// With no stored choice, theme.css follows prefers-color-scheme on its own.
			try {
				const stored = localStorage.getItem("theme");
				if (stored === "light" || stored === "dark") document.documentElement.dataset.theme = stored;
			} catch {}
		</script>
	</head>
	<body>
		<a class="skip-link" href="#main">Skip to content</a>
		<Nav />
		<main id="main">
			<slot />
		</main>
	</body>
</html>
```

- [ ] **Step 5: Create `src/components/ThemeToggle.astro`**

```astro
<button type="button" class="theme-toggle" data-theme-toggle aria-pressed="false">
	<span class="icon" aria-hidden="true"></span>
	<span class="label">Dark mode</span>
</button>

<script>
	import { resolveTheme } from "../lib/theme";

	const STORAGE_KEY = "theme";

	const readStored = (): "light" | "dark" | null => {
		try {
			const value = localStorage.getItem(STORAGE_KEY);
			return value === "light" || value === "dark" ? value : null;
		} catch {
			return null;
		}
	};

	const currentTheme = () =>
		resolveTheme(readStored(), window.matchMedia("(prefers-color-scheme: dark)").matches);

	const button = document.querySelector<HTMLButtonElement>("[data-theme-toggle]");
	const render = () => button?.setAttribute("aria-pressed", String(currentTheme() === "dark"));

	button?.addEventListener("click", () => {
		const next = currentTheme() === "dark" ? "light" : "dark";
		document.documentElement.dataset.theme = next;
		try {
			localStorage.setItem(STORAGE_KEY, next);
		} catch {}
		render();
	});

	render();
</script>

<style>
	.theme-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.35rem 0.75rem;
		font: inherit;
		font-family: var(--font-heading);
		font-size: 0.75rem;
		text-transform: uppercase;
		color: var(--color-foreground);
		background: var(--color-background);
		border: 2px solid var(--color-foreground);
		box-shadow: 3px 3px 0 var(--color-foreground);
		cursor: pointer;
	}

	.theme-toggle:active {
		transform: translate(2px, 2px);
		box-shadow: 1px 1px 0 var(--color-foreground);
	}

	.icon::before {
		content: "☾";
	}

	.theme-toggle[aria-pressed="true"] .icon::before {
		content: "☀";
	}
</style>
```

- [ ] **Step 6: Replace `src/components/Nav.astro`**

```astro
---
import ThemeToggle from "./ThemeToggle.astro";

const links = [
	{ href: "/", label: "Home" },
	{ href: "/projects/", label: "Projects" },
	{ href: "/work/", label: "Work Experience" },
	{ href: "/blog/", label: "Blog" },
	{ href: "/contact/", label: "Contact" },
];

// Normalise "/projects" and "/projects/" to the same thing.
const path = Astro.url.pathname.replace(/\/+$/, "") || "/";
const isCurrent = (href: string) => {
	const target = href.replace(/\/+$/, "") || "/";
	return target === "/" ? path === "/" : path === target || path.startsWith(`${target}/`);
};
---

<header class="site-header">
	<nav aria-label="Main">
		<ul>
			{
				links.map(({ href, label }) => (
					<li>
						<a href={href} aria-current={isCurrent(href) ? "page" : undefined}>
							{label}
						</a>
					</li>
				))
			}
		</ul>
	</nav>
	<ThemeToggle />
</header>

<style>
	.site-header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.75rem clamp(1rem, 4vw, 2rem);
		background: var(--color-surface);
		border-bottom: 3px solid var(--color-foreground);
	}

	ul {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	a {
		display: inline-block;
		padding: 0.4rem 1rem;
		font-family: var(--font-heading);
		font-size: 0.8rem;
		text-transform: uppercase;
		text-decoration: none;
		color: var(--color-foreground);
		/* Persona-style diagonal cut; chrome only. */
		clip-path: polygon(8% 0, 100% 0, 92% 100%, 0 100%);
	}

	a:hover {
		background: var(--color-border);
	}

	a[aria-current="page"] {
		background: var(--color-accent);
		color: var(--color-on-accent);
	}

	/* clip-path would clip an outline, so focus is shown with fill + underline instead. */
	a:focus-visible {
		outline: none;
		background: var(--color-accent);
		color: var(--color-on-accent);
		text-decoration: underline;
	}
</style>
```

- [ ] **Step 7: Replace the homepage with a temporary stub and delete starter files**

`src/pages/index.astro`:

```astro
---
import Layout from "../layouts/Layout.astro";
---

<Layout title="Home">
	<h1 class="page-title">Minh Le</h1>
	<p>Portfolio under construction. The Desktop homepage lands in a later step.</p>
</Layout>
```

```bash
git rm src/components/Welcome.astro src/assets/astro.svg src/assets/background.svg
```

Update each of `src/pages/projects.astro`, `work.astro`, `blog.astro`, `contact.astro` so their `<h1>`/heading uses `class="page-title"`, if they have one. If a stub has only a `<p>`, add `<h1 class="page-title">{Section name}</h1>` above it.

- [ ] **Step 8: Verify**

```bash
npm test             # Expected: 3 passed (resolveTheme)
npm run typecheck    # Expected: 0 errors
npm run build        # Expected: 5 page(s) built
astro dev --background
```

In a browser at the dev URL:
- (a) All 5 nav links resolve, and the current page's link is highlighted.
- (b) The toggle flips the palette.
- (c) Reload keeps the choice.
- (d) Clearing localStorage + OS dark mode → dark palette with no flash.
- (e) Tab key shows the skip link, and visible focus on nav links.

Then run `astro dev stop`.

- [ ] **Step 9: Write `docs/learning/01-site-shell-and-theme.md`**

Key concepts: Astro layouts and `<slot />`; scoped `<style>` vs global stylesheet; CSS custom properties as design tokens; `prefers-color-scheme` + `[data-theme]` override cascade; `is:inline` script vs bundled `<script>` (why the no-flash init must be inline); pure-function/DOM-wrapper split for `resolveTheme`; `aria-current` / `aria-pressed`; why `clip-path` breaks focus outlines.
Exercise: add a third "system" option to the toggle (clears the stored choice). Hint: `resolveTheme(null, …)` already handles it. Check: after choosing system, flipping the OS theme changes the site.

- [ ] **Step 10: Commit**

```bash
git add -A src package.json docs/learning/01-site-shell-and-theme.md
git commit -m "feat: site shell, theme tokens, persistent light/dark toggle"
```

---

### Task 2: CI deploy to GitHub Pages (#3)

**Files:**
- Modify: `astro.config.mjs`
- Create: `.github/workflows/deploy.yml`
- Create: `docs/learning/02-ci-deploy.md`

**Interfaces:**
- Consumes: npm scripts `test`, `typecheck`, `build` (exist).
- Produces: deploy on every push to `main`; PRs run checks without deploying.

- [ ] **Step 1: Set `site` in `astro.config.mjs`**

Add `site: "https://mlhv.github.io",` as the first property inside `defineConfig({ ... })`, above `fonts`. Leave the existing `fonts` array unchanged. Do not add `base`.

- [ ] **Step 2: Create `.github/workflows/deploy.yml`**

Action versions are the latest majors as of 2026-10-16. Re-check with `gh api repos/actions/<name>/releases/latest -q .tag_name` if this runs much later.

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run typecheck
      - run: npm run build
      - uses: actions/upload-pages-artifact@v5
        if: github.event_name != 'pull_request'
        with:
          path: dist

  deploy:
    if: github.event_name != 'pull_request'
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```

- [ ] **Step 3: Verify locally that CI's commands pass from a clean install**

```bash
rm -rf node_modules dist && npm ci && npm test && npm run typecheck && npm run build
```
Expected: all succeed. (`npm ci` fails if `package-lock.json` is out of sync; if so, run `npm install` and commit the lockfile.)

- [ ] **Step 4: Commit**

```bash
git add astro.config.mjs .github/workflows/deploy.yml
git commit -m "ci: build, test and deploy to GitHub Pages on push to main"
```

- [ ] **Step 5: ⚠ Owner go-ahead required: enable Pages and go live**

Ask the owner before running any of this. It changes repo settings and publishes the site.

```bash
gh api repos/mlhv/mlhv.github.io/pages -q .build_type 2>/dev/null \
  && gh api -X PUT repos/mlhv/mlhv.github.io/pages -f build_type=workflow \
  || gh api -X POST repos/mlhv/mlhv.github.io/pages -f build_type=workflow
git switch main && git merge --ff-only portfolio-v1 && git push origin main && git switch portfolio-v1
gh run watch --exit-status $(gh run list --workflow deploy.yml --limit 1 --json databaseId -q '.[0].databaseId')
curl -sI https://mlhv.github.io | head -1    # Expected: HTTP/2 200
```

- [ ] **Step 6: Write `docs/learning/02-ci-deploy.md`**

Key concepts: GitHub Actions anatomy (workflow → jobs → steps, `uses` vs `run`); triggers (`push`, `pull_request`, `workflow_dispatch`); `npm ci` vs `npm install`; the Pages artifact + `deploy-pages` flow and why it needs `pages: write` + `id-token: write` (OIDC); `concurrency`; why tests/typecheck gate the deploy; user site vs project site (`base`).
Exercise: break a test on a throwaway branch, open a PR, and watch the build job fail while nothing deploys. Check: the PR's checks are red and the live site is unchanged.

- [ ] **Step 7: Commit**

```bash
git add docs/learning/02-ci-deploy.md && git commit -m "docs: learning notes for CI deploy"
```

---

### Task 3: Résumé parser (pure, TDD)

**Files:**
- Create: `src/lib/__fixtures__/master-resume.tex`
- Create: `src/lib/resume.ts`
- Test: `src/lib/resume.test.ts`

**Interfaces:**
- Produces (all exported from `src/lib/resume.ts`):
  - types `Contact { email; linkedin; github }`, `Education { school; location; degree; date; details: string[] }`, `SkillGroup { label; items: string[] }`, `Experience { company; role; location; startDate; endDate; highlights: string[] }`, `ResumeProject { slug; title; techStack: string[]; highlights: string[] }`, `Resume { name; contact; education; skills; experience; projects }`, `SiteResume = Omit<Resume, 'projects'>` (all string fields are `string`)
  - `parseResume(tex: string): Resume`: throws if the heading or Experience section is missing
  - `cleanLatex(s: string): string`
  - `stripPhone(tex: string): string`, `containsPhone(s: string): boolean`, `stripComments(tex: string): string`
  - `publicPdfSource(tex: string): string`: phone stripped + pdfTeX-only lines guarded for tectonic
  - `projectSeedMarkdown(project: ResumeProject, order: number): string`
  - `displayUrl(url: string): string`: `"https://www.linkedin.com/in/x"` → `"linkedin.com/in/x"`

- [ ] **Step 1: Create the fixture (phone-free copy of the real résumé)**

```bash
mkdir -p src/lib/__fixtures__
sed -E 's/\(?[0-9]{3}\)?[ .-]*[0-9]{3}[ .-]*[0-9]{4}[[:space:]]*\$\|\$[[:space:]]*//' \
  ~/Desktop/resume/sources/master-resume.tex > src/lib/__fixtures__/master-resume.tex
grep -nE '867-5309|\(555\)' src/lib/__fixtures__/master-resume.tex   # Expected: no output
# (The template's commented-out sample line `+1-123-456-7890` stays; comments never render.)
```

- [ ] **Step 2: Write the failing tests in `src/lib/resume.test.ts`**

The fixture is loaded with Vite's `?raw` import, so the tests need no Node `fs` types.

```ts
import { describe, expect, it } from 'vitest';
import fixture from './__fixtures__/master-resume.tex?raw';
import {
	cleanLatex,
	containsPhone,
	displayUrl,
	parseResume,
	projectSeedMarkdown,
	publicPdfSource,
	stripComments,
	stripPhone,
} from './resume';

describe('cleanLatex', () => {
	it('unwraps formatting commands, including nested ones', () => {
		expect(cleanLatex('\\textbf{RAG} and \\emph{\\textbf{Go}}')).toBe('RAG and Go');
	});

	it('converts escapes and symbols used by the resume', () => {
		expect(cleanLatex('\\textbf{$\\sim$2s}, 35\\%, R\\&D, \\$12/mo, A $|$ B, Mar -- Sept')).toBe(
			'~2s, 35%, R&D, $12/mo, A | B, Mar – Sept',
		);
	});

	it('replaces links with their text and collapses whitespace', () => {
		expect(cleanLatex('\\href{https://x.dev}{x.dev}  \n  next')).toBe('x.dev next');
	});
});

describe('parseResume (real resume fixture)', () => {
	const resume = parseResume(fixture);

	it('reads the name and contact links', () => {
		expect(resume.name).toBe('Minh Le');
		expect(resume.contact).toEqual({
			email: 'levuhoangminh1@gmail.com',
			linkedin: 'https://www.linkedin.com/in/hoangminhvule',
			github: 'https://github.com/mlhv',
		});
	});

	it('reads education with its detail bullets', () => {
		expect(resume.education).toHaveLength(1);
		expect(resume.education[0]).toMatchObject({
			school: 'Drexel University',
			location: 'Philadelphia, PA',
			date: 'Expected May 2028',
		});
		expect(resume.education[0].details[0]).toMatch(/^Coursework:/);
	});

	it('reads skill groups as label + item lists', () => {
		expect(resume.skills.map((s) => s.label)).toEqual([
			'Languages',
			'Frameworks',
			'Libraries & Tools',
			'Databases & Infrastructure',
		]);
		expect(resume.skills[0].items).toContain('Go (Golang)');
	});

	it('reads experience in resume order with the {company}{dates}{role}{location} argument order', () => {
		expect(resume.experience.map((e) => e.company)).toEqual(['VisioneerIT', 'Bentley Systems', 'Drexel University']);
		expect(resume.experience[1]).toMatchObject({
			role: 'Software Engineer Intern',
			location: 'Philadelphia, PA',
			startDate: 'Mar 2025',
			endDate: 'Sept 2025',
		});
		expect(resume.experience[1].highlights).toHaveLength(3);
		expect(resume.experience[1].highlights[0]).toContain('from ~2s to 0.2s');
	});

	it('reads projects with slug, title, tech stack and bullets', () => {
		expect(resume.projects.map((p) => p.slug)).toEqual([
			'pkmn-quant',
			'opentelemetry',
			'harbor',
			'sightlink',
			'dragon-shell',
			'socialgym',
			'stylify',
			'du-professorview',
		]);
		expect(resume.projects[0]).toMatchObject({
			title: 'Pkmn-Quant - Algorithmic Trading Backtester',
			techStack: ['Python', 'Polars', 'C++', 'scikit-learn', 'DuckDB'],
		});
		expect(resume.projects[0].highlights).toHaveLength(3);
	});

	it('ignores commented-out LaTeX', () => {
		expect(JSON.stringify(resume)).not.toContain('Sourabh');
		expect(JSON.stringify(resume)).not.toContain('JWT middleware');
	});

	it('never outputs a phone number', () => {
		const withPhone = fixture.replace('\\small \\href{mailto', '\\small (555) 123-4567 $|$ \\href{mailto');
		expect(containsPhone(JSON.stringify(parseResume(withPhone)))).toBe(false);
	});
});

describe('parseResume (template drift)', () => {
	it('throws when the Experience section is missing', () => {
		const noExperience = fixture.replace('\\section{Experience}', '\\section{Work}');
		expect(() => parseResume(noExperience)).toThrow(/Experience/);
	});

	it('throws when the heading block is missing', () => {
		expect(() => parseResume('\\section{Experience}')).toThrow(/heading/);
	});
});

describe('phone handling for the public PDF', () => {
	const heading = (phone: string) => `\\small ${phone} $|$ \\href{mailto:a@b.c}{a@b.c}`;

	it.each(['(555) 867-5309', '555-867-5309', '555.867.5309', '555 867 5309'])('strips %s', (phone) => {
		const out = stripPhone(heading(phone));
		expect(out).toBe('\\small \\href{mailto:a@b.c}{a@b.c}');
		expect(containsPhone(out)).toBe(false);
	});

	it('does not flag resume numbers that are not phone numbers', () => {
		// The raw fixture has a commented-out template sample (+1-123-456-7890); only rendered text matters.
		expect(containsPhone(stripComments(fixture))).toBe(false);
	});

	it('publicPdfSource strips the phone and guards pdfTeX-only lines', () => {
		const src = publicPdfSource(`\\input{glyphtounicode}\n\\pdfgentounicode=1\n${heading('(555) 867-5309')}`);
		expect(containsPhone(src)).toBe(false);
		expect(src).toContain('\\ifdefined\\pdfgentounicode \\input{glyphtounicode}\\fi');
		expect(src).toContain('\\ifdefined\\pdfgentounicode \\pdfgentounicode=1\\fi');
	});
});

describe('projectSeedMarkdown', () => {
	it('writes frontmatter matching the projects schema, and bullets as the body', () => {
		const md = projectSeedMarkdown(
			{ slug: 'x', title: 'X "quoted"', techStack: ['Go', 'C'], highlights: ['First.', 'Second.'] },
			3,
		);
		expect(md).toBe(
			[
				'---',
				'title: "X \\"quoted\\""',
				'description: "First."',
				'techStack: ["Go","C"]',
				'featured: false',
				'order: 3',
				'---',
				'',
				'- First.',
				'- Second.',
				'',
			].join('\n'),
		);
	});
});

describe('displayUrl', () => {
	it('drops the protocol, www and trailing slash', () => {
		expect(displayUrl('https://www.linkedin.com/in/hoangminhvule/')).toBe('linkedin.com/in/hoangminhvule');
		expect(displayUrl('https://github.com/mlhv')).toBe('github.com/mlhv');
	});
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/lib/resume.test.ts`
Expected: FAIL. `Failed to resolve import "./resume"`.

- [ ] **Step 4: Implement `src/lib/resume.ts`**

This parser has already been prototyped against the real résumé: it produces 3 roles, 4 skill groups and 8 projects.

```ts
export interface Contact {
	email: string;
	linkedin: string;
	github: string;
}

export interface Education {
	school: string;
	location: string;
	degree: string;
	date: string;
	details: string[];
}

export interface SkillGroup {
	label: string;
	items: string[];
}

export interface Experience {
	company: string;
	role: string;
	location: string;
	startDate: string;
	endDate: string;
	highlights: string[];
}

export interface ResumeProject {
	slug: string;
	title: string;
	techStack: string[];
	highlights: string[];
}

export interface Resume {
	name: string;
	contact: Contact;
	education: Education[];
	skills: SkillGroup[];
	experience: Experience[];
	projects: ResumeProject[];
}

/** Résumé data the site renders: everything except projects, which live in src/content/projects. */
export type SiteResume = Omit<Resume, 'projects'>;

/** Strip LaTeX comments: a `%` not escaped as `\%` runs to end of line. */
export const stripComments = (tex: string): string => tex.replace(/(?<!\\)%.*$/gm, '');

/**
 * Read `count` brace-delimited arguments starting at `pos` (whitespace between
 * arguments is skipped). Braces nest. Returns the raw argument text and the
 * index just past the last closing brace.
 */
const readArgs = (src: string, pos: number, count: number): { args: string[]; end: number } => {
	const args: string[] = [];
	let i = pos;
	for (let n = 0; n < count; n++) {
		while (/\s/.test(src[i] ?? '')) i++;
		if (src[i] !== '{') throw new Error(`Expected '{' at offset ${i}, found '${src[i] ?? 'EOF'}'`);
		let depth = 0;
		const start = i + 1;
		for (; i < src.length; i++) {
			if (src[i] === '\\') {
				i++; // skip the escaped character, e.g. \{ or \%
				continue;
			}
			if (src[i] === '{') depth++;
			if (src[i] === '}' && --depth === 0) break;
		}
		if (depth !== 0) throw new Error(`Unbalanced braces starting at offset ${start - 1}`);
		args.push(src.slice(start, i));
		i++;
	}
	return { args, end: i };
};

/** Convert a LaTeX fragment from the résumé template into plain text. */
export const cleanLatex = (s: string): string => {
	let out = s.replace(/\\href\{[^{}]*\}\{([^{}]*)\}/g, '$1');
	let prev: string;
	do {
		prev = out;
		out = out.replace(/\\(?:textbf|emph|textit|underline)\{([^{}]*)\}/g, '$1');
	} while (out !== prev);
	return out
		.replace(/\\(?:small|Huge|Large|large|scshape|vspace\{[^}]*\})/g, '')
		.replace(/\$\\sim\$/g, '~')
		.replace(/\$\|\$/g, '|')
		.replace(/\\([%&$#_])/g, '$1')
		.replace(/--/g, '–')
		.replace(/\\\\/g, ' ')
		.replace(/[{}]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
};

const slugify = (s: string): string =>
	s
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

const splitList = (s: string): string[] =>
	cleanLatex(s)
		.split(',')
		.map((x) => x.trim())
		.filter(Boolean);

type Block = { args: string[]; items: string[] };

/** Walk a section body, grouping each \resumeItem under the heading macro before it. */
const readBlocks = (body: string): Block[] => {
	const blocks: Block[] = [];
	// (?![A-Za-z]) stops \resumeItem matching \resumeItemListStart.
	const re = /\\(resumeSubheading|resumeProjectHeading|resumeItem)(?![A-Za-z])/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(body))) {
		const macro = m[1];
		const count = macro === 'resumeSubheading' ? 4 : macro === 'resumeProjectHeading' ? 2 : 1;
		const { args, end } = readArgs(body, re.lastIndex, count);
		if (macro === 'resumeItem') blocks.at(-1)?.items.push(cleanLatex(args[0]));
		else blocks.push({ args, items: [] });
		re.lastIndex = end;
	}
	return blocks;
};

/** Split the document into `{ title, body }` per \section; titles are lower-cased plain text. */
const readSections = (tex: string): { title: string; body: string }[] => {
	const re = /\\section\{/g;
	const starts: { title: string; bodyStart: number; at: number }[] = [];
	let m: RegExpExecArray | null;
	while ((m = re.exec(tex))) {
		const { args, end } = readArgs(tex, m.index + '\\section'.length, 1);
		starts.push({ title: cleanLatex(args[0]).toLowerCase(), bodyStart: end, at: m.index });
	}
	return starts.map((s, i) => ({
		title: s.title,
		body: tex.slice(s.bodyStart, starts[i + 1]?.at ?? tex.length),
	}));
};

const readHeading = (tex: string): { name: string; contact: Contact } => {
	const center = tex.match(/\\begin\{center\}([\s\S]*?)\\end\{center\}/)?.[1];
	if (!center) throw new Error('Résumé heading (\\begin{center} block) not found');
	const bold = center.indexOf('\\textbf');
	if (bold === -1) throw new Error('Résumé heading has no \\textbf{name}');
	const name = cleanLatex(readArgs(center, bold + '\\textbf'.length, 1).args[0]);
	// Only \href targets are read, so the phone number (plain text) is never extracted.
	const hrefs = [...center.matchAll(/\\href\{([^{}]*)\}/g)].map((h) => h[1]);
	const find = (pred: (url: string) => boolean, label: string): string => {
		const url = hrefs.find(pred);
		if (!url) throw new Error(`Résumé heading is missing a ${label} link`);
		return url;
	};
	return {
		name,
		contact: {
			email: find((u) => u.startsWith('mailto:'), 'mailto:').slice('mailto:'.length),
			linkedin: find((u) => u.includes('linkedin.com'), 'LinkedIn'),
			github: find((u) => u.includes('github.com'), 'GitHub'),
		},
	};
};

/** Parse master-resume.tex (Jake's Resume template) into structured data. */
export const parseResume = (rawTex: string): Resume => {
	const tex = stripComments(rawTex);
	const { name, contact } = readHeading(tex);
	const resume: Resume = { name, contact, education: [], skills: [], experience: [], projects: [] };

	for (const { title, body } of readSections(tex)) {
		if (title.startsWith('education')) {
			for (const b of readBlocks(body)) {
				// Education macro order: {school}{location}{degree}{date}
				const [school, location, degree, date] = b.args.map(cleanLatex);
				resume.education.push({ school, location, degree, date, details: b.items });
			}
		} else if (title.includes('skills')) {
			for (const m of body.matchAll(/\\textbf\{([^{}]*)\}\{:\s*([^{}]*)\}/g)) {
				resume.skills.push({ label: cleanLatex(m[1]), items: splitList(m[2]) });
			}
		} else if (title.startsWith('experience')) {
			for (const b of readBlocks(body)) {
				// Experience macro order differs: {company}{dates}{role}{location}
				const [company, dates, role, location] = b.args;
				const [startDate, endDate = ''] = dates.split('--').map(cleanLatex);
				resume.experience.push({
					company: cleanLatex(company),
					role: cleanLatex(role),
					location: cleanLatex(location),
					startDate,
					endDate,
					highlights: b.items,
				});
			}
		} else if (title.startsWith('projects')) {
			for (const b of readBlocks(body)) {
				const [nameRaw, stackRaw = ''] = b.args[0].split('$|$');
				const projectTitle = cleanLatex(nameRaw);
				resume.projects.push({
					slug: slugify(projectTitle.split(/ [-–(]/)[0]),
					title: projectTitle,
					techStack: splitList(stackRaw),
					highlights: b.items,
				});
			}
		}
	}

	if (resume.experience.length === 0) {
		throw new Error('No entries found in an "Experience" section; has the résumé template changed?');
	}
	return resume;
};

const PHONE = /\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4}/;

/** True if the text contains anything shaped like a US phone number. */
export const containsPhone = (s: string): boolean => PHONE.test(s);

/** Remove the phone number (and its trailing `$|$` separator) from the .tex heading. */
export const stripPhone = (tex: string): string =>
	tex.replace(new RegExp(`${PHONE.source}\\s*\\$\\|\\$\\s*`, 'g'), '');

// Tectonic is XeTeX-based; these template lines exist only in pdfTeX, so guard them.
const PDFTEX_ONLY = ['\\input{glyphtounicode}', '\\pdfgentounicode=1'];

/** The .tex to compile for the public PDF: phone removed, pdfTeX-only lines guarded for tectonic. */
export const publicPdfSource = (tex: string): string =>
	PDFTEX_ONLY.reduce(
		(src, line) => src.replace(line, `\\ifdefined\\pdfgentounicode ${line}\\fi`),
		stripPhone(tex),
	);

/** Markdown for a newly seeded Project entry. JSON strings are valid YAML. */
export const projectSeedMarkdown = (project: ResumeProject, order: number): string =>
	[
		'---',
		`title: ${JSON.stringify(project.title)}`,
		`description: ${JSON.stringify(project.highlights[0] ?? '')}`,
		`techStack: ${JSON.stringify(project.techStack)}`,
		'featured: false',
		`order: ${order}`,
		'---',
		'',
		...project.highlights.map((h) => `- ${h}`),
		'',
	].join('\n');

/** "https://www.linkedin.com/in/x/" → "linkedin.com/in/x" */
export const displayUrl = (url: string): string => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/+$/, '');
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, all `resume.test.ts` and `theme.test.ts` tests.

If `typecheck` complains about the `?raw` import, add `/// <reference types="vite/client" />` at the top of `resume.test.ts`.

```bash
npm run typecheck   # Expected: 0 errors
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/resume.ts src/lib/resume.test.ts src/lib/__fixtures__/master-resume.tex
git commit -m "feat: pure résumé parser with phone stripping, tested against the real résumé"
```

---

### Task 4: Sync script, first sync, ADR 0003

**Files:**
- Create: `scripts/sync-resume.ts`
- Create (generated): `src/data/resume.json`, `public/resume.pdf`
- Create: `src/lib/resume-data.ts`
- Modify: `package.json` (script + `@types/node`)
- Create: `docs/adr/0003-resume-repo-source-of-truth.md`
- Modify: `CONTEXT.md`
- Create: `docs/learning/03-resume-sync.md`

**Interfaces:**
- Consumes: `parseResume`, `publicPdfSource`, `containsPhone`, `stripComments`, `projectSeedMarkdown`, `SiteResume` from `src/lib/resume.ts`.
- Produces: `resume: SiteResume` from `src/lib/resume-data.ts` (pages import this, never the JSON directly). CLI `npm run sync-resume [-- --seed-projects]`, env `RESUME_DIR`, `RESUME_TEX`.

- [ ] **Step 1: Add Node types and the npm script**

```bash
npm install --save-dev @types/node@24
```

In `package.json` `scripts`, add: `"sync-resume": "node scripts/sync-resume.ts"`.

- [ ] **Step 2: Create `scripts/sync-resume.ts`**

```ts
/**
 * Sync résumé data from the resume repo into the portfolio.
 *
 *   npm run sync-resume                       # src/data/resume.json + public/resume.pdf
 *   npm run sync-resume -- --seed-projects    # also create MISSING src/content/projects/<slug>.md
 *
 * Env: RESUME_DIR (default ~/Desktop/resume), RESUME_TEX (default sources/master-resume.tex, relative to RESUME_DIR).
 * Existing project files are never overwritten, and projects are only seeded with the flag,
 * so deleting a project file keeps it deleted.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { containsPhone, parseResume, projectSeedMarkdown, publicPdfSource, stripComments } from '../src/lib/resume.ts';

const root = resolve(import.meta.dirname, '..');
const resumeDir = process.env.RESUME_DIR ?? join(homedir(), 'Desktop', 'resume');
const texName = process.env.RESUME_TEX ?? 'sources/master-resume.tex';
const texPath = resolve(resumeDir, texName);
const seedProjects = process.argv.includes('--seed-projects');

if (!existsSync(texPath)) {
	console.error(`✗ ${texPath} not found. Set RESUME_DIR / RESUME_TEX.`);
	process.exit(1);
}

const tex = readFileSync(texPath, 'utf8');
// parseResume throws on template drift before anything is written.
const { projects, ...site } = parseResume(tex);

mkdirSync(join(root, 'src/data'), { recursive: true });
writeFileSync(
	join(root, 'src/data/resume.json'),
	`${JSON.stringify({ _generated: `npm run sync-resume from ${texName}. Do not edit by hand.`, ...site }, null, '\t')}\n`,
);
console.log(`✓ src/data/resume.json: ${site.experience.length} roles, ${site.skills.length} skill groups`);

const hasTectonic = (() => {
	try {
		execFileSync('tectonic', ['--version'], { stdio: 'ignore' });
		return true;
	} catch {
		return false;
	}
})();

const pdfTex = publicPdfSource(tex);
// Comments never render, so only check live LaTeX (the template has a commented-out sample number).
if (containsPhone(stripComments(pdfTex))) {
	console.error('✗ A phone number survived stripping; refusing to build public/resume.pdf. Check the résumé heading format.');
	process.exitCode = 1;
} else if (!hasTectonic) {
	console.warn('⚠ tectonic not found (brew install tectonic); public/resume.pdf left unchanged');
} else {
	const work = mkdtempSync(join(tmpdir(), 'resume-sync-'));
	try {
		writeFileSync(join(work, 'resume.tex'), pdfTex);
		execFileSync('tectonic', ['--outdir', work, join(work, 'resume.tex')], { stdio: 'pipe' });
		copyFileSync(join(work, 'resume.pdf'), join(root, 'public/resume.pdf'));
		console.log('✓ public/resume.pdf built (phone number removed)');
	} catch (error) {
		const stderr = (error as { stderr?: Buffer }).stderr?.toString() ?? String(error);
		console.error(`✗ PDF build failed:\n${stderr.split('\n').filter((l) => l.startsWith('error') || l.startsWith('!')).join('\n') || stderr}`);
		process.exitCode = 1;
	} finally {
		rmSync(work, { recursive: true, force: true });
	}
}

if (seedProjects) {
	const dir = join(root, 'src/content/projects');
	mkdirSync(dir, { recursive: true });
	const created = projects.flatMap((project, i) => {
		const file = join(dir, `${project.slug}.md`);
		if (existsSync(file)) return [];
		writeFileSync(file, projectSeedMarkdown(project, i + 1));
		return [project.slug];
	});
	console.log(created.length ? `✓ seeded projects: ${created.join(', ')}` : '✓ projects: every résumé project already has a file');
} else {
	console.log(`• projects untouched (${projects.length} in résumé; pass --seed-projects to create missing files)`);
}
```

- [ ] **Step 3: Run the first sync and verify the outputs**

```bash
npm run sync-resume
```
Expected output:
```
✓ src/data/resume.json: 3 roles, 4 skill groups
✓ public/resume.pdf built (phone number removed)
• projects untouched (8 in résumé; pass --seed-projects to create missing files)
```
Then check:
```bash
grep -cE '867|5309' src/data/resume.json   # Expected: 0
ls -l public/resume.pdf                      # Expected: ~40 KB
```
Open `public/resume.pdf` (Read tool or `open`) and confirm the heading reads `email | linkedin | github` with no phone number.

- [ ] **Step 4: Create `src/lib/resume-data.ts`**

```ts
import data from '../data/resume.json';
import type { SiteResume } from './resume';

/** The synced résumé (see scripts/sync-resume.ts). Typed here so a shape change fails `astro check`. */
export const resume: SiteResume = data;
```

Run: `npm run typecheck`. Expected: 0 errors, including `scripts/sync-resume.ts`.

- [ ] **Step 5: Write ADR 0003 at `docs/adr/0003-resume-repo-source-of-truth.md`**

```markdown
# The résumé repo is the source of truth for résumé data

Contact links, education, skills and work experience come from `~/Desktop/resume/sources/master-resume.tex`, the same file the owner already maintains for job applications. `npm run sync-resume` parses it into `src/data/resume.json` and builds a phone-free `public/resume.pdf`; both are committed. CI never reads the résumé repo, because that repo also holds private job-tracking data, so the deploy depends only on this repo. Projects are seeded from the résumé once (`--seed-projects`) and then curated here, since each one gets its own logo and write-up that the résumé can't hold. Rejected: hand-maintaining a second copy (drifts), a git submodule + CI parse (exposes the résumé repo), and a new YAML source generating both (reworks the résumé workflow mid-recruiting).
```

- [ ] **Step 6: Update `CONTEXT.md`**

Replace the **Work Experience Entry** definition with:

```markdown
**Work Experience Entry**:
A professional role (internship or job) held, shown in the Work Experience section and on the Resume page. Never authored in this repo: synced from the master résumé into `src/data/resume.json` by `npm run sync-resume` (ADR 0003).
_Avoid_: Job, position (as the entry name)
```

Add after it:

```markdown
**Resume**:
The `/resume` page plus `public/resume.pdf`, both generated from the master résumé. The phone number is never published.
```

- [ ] **Step 7: Write `docs/learning/03-resume-sync.md`**

Key concepts: the "functional core, imperative shell" split (`src/lib/resume.ts` pure vs `scripts/sync-resume.ts` I/O); writing a small recursive-descent-ish reader (`readArgs` brace matching) vs regex alone; fixture-based tests against real data; Vite `?raw` imports; Node native TypeScript (type stripping, why imports use `.ts`); failing loudly on input drift; generated-and-committed artifacts; idempotent seeding.
Exercise: add a `website` field to `Contact` that's optional, read from any `\href` that isn't mailto/LinkedIn/GitHub. Hint: TDD it in `resume.test.ts` with an inline heading string. Check: tests pass and `resume.json` is unchanged for the current résumé.

- [ ] **Step 8: Commit**

```bash
git add scripts/sync-resume.ts src/data/resume.json public/resume.pdf src/lib/resume-data.ts package.json package-lock.json docs/adr/0003-resume-repo-source-of-truth.md CONTEXT.md docs/learning/03-resume-sync.md
git commit -m "feat: sync résumé data and phone-free PDF from the résumé repo"
```

---

### Task 5: Work Experience, `/resume`, Contact (#5, #8)

**Files:**
- Modify: `src/pages/work.astro`
- Create: `src/pages/resume.astro`
- Modify: `src/pages/contact.astro`
- Create: `docs/learning/04-resume-pages.md`

**Interfaces:**
- Consumes: `resume: SiteResume` from `src/lib/resume-data.ts`; `displayUrl` from `src/lib/resume.ts`; `Layout`; global `.page-title`, `.muted`.

- [ ] **Step 1: Replace `src/pages/work.astro`**

```astro
---
import Layout from "../layouts/Layout.astro";
import { resume } from "../lib/resume-data";
---

<Layout title="Work Experience" description="Minh Le's software engineering internships and research roles.">
	<h1 class="page-title">Work Experience</h1>
	<p class="links"><a href="/resume/">View résumé</a> · <a href="/resume.pdf">Download PDF</a></p>

	<ol class="roles">
		{
			resume.experience.map((job) => (
				<li class="role">
					<header>
						<h2>{job.company}</h2>
						<p class="meta">
							<span>{job.role}</span>
							<span>{job.location}</span>
							<span>
								{job.startDate} – {job.endDate || "Present"}
							</span>
						</p>
					</header>
					<ul>
						{job.highlights.map((h) => (
							<li>{h}</li>
						))}
					</ul>
				</li>
			))
		}
	</ol>
</Layout>

<style>
	/* Data-dense area: plain, high-contrast, no Persona accents. */
	.roles {
		display: grid;
		gap: 1.25rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.role {
		max-width: none;
		padding: 1.25rem 1.5rem;
		background: var(--color-surface);
		border: 2px solid var(--color-border);
		border-left: 6px solid var(--color-accent);
	}

	h2 {
		margin: 0;
		font-size: 1.2rem;
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1.25rem;
		margin: 0.25rem 0 0.75rem;
		color: var(--color-muted);
	}

	.role ul {
		margin: 0;
		padding-left: 1.25rem;
	}

	.role li + li {
		margin-top: 0.4rem;
	}
</style>
```

- [ ] **Step 2: Create `src/pages/resume.astro`**

```astro
---
import Layout from "../layouts/Layout.astro";
import { resume } from "../lib/resume-data";
import { displayUrl } from "../lib/resume";

const { name, contact, education, skills, experience } = resume;
---

<Layout title="Résumé" description={`${name}'s résumé: education, skills, and experience.`}>
	<article class="resume">
		<header>
			<h1>{name}</h1>
			<p class="contact">
				<a href={`mailto:${contact.email}`}>{contact.email}</a> ·
				<a href={contact.linkedin}>{displayUrl(contact.linkedin)}</a> ·
				<a href={contact.github}>{displayUrl(contact.github)}</a>
			</p>
			<p><a class="download" href="/resume.pdf" download>Download PDF</a></p>
		</header>

		<section>
			<h2>Education</h2>
			{
				education.map((e) => (
					<div class="entry">
						<div class="entry-head">
							<strong>{e.school}</strong>
							<span>{e.location}</span>
						</div>
						<div class="entry-head muted">
							<em>{e.degree}</em>
							<span>{e.date}</span>
						</div>
						<ul>
							{e.details.map((d) => (
								<li>{d}</li>
							))}
						</ul>
					</div>
				))
			}
		</section>

		<section>
			<h2>Skills</h2>
			<dl class="skills">
				{
					skills.map((s) => (
						<div>
							<dt>{s.label}</dt>
							<dd>{s.items.join(", ")}</dd>
						</div>
					))
				}
			</dl>
		</section>

		<section>
			<h2>Experience</h2>
			{
				experience.map((job) => (
					<div class="entry">
						<div class="entry-head">
							<strong>{job.company}</strong>
							<span>
								{job.startDate} – {job.endDate || "Present"}
							</span>
						</div>
						<div class="entry-head muted">
							<em>{job.role}</em>
							<span>{job.location}</span>
						</div>
						<ul>
							{job.highlights.map((h) => (
								<li>{h}</li>
							))}
						</ul>
					</div>
				))
			}
		</section>

		<p>Projects and open-source work: <a href="/projects/">see Projects</a>.</p>
	</article>
</Layout>

<style>
	/* Plain single column: theme colors and heading font only; no Window chrome. */
	.resume {
		max-width: 46rem;
	}

	h1 {
		margin: 0 0 0.25rem;
		font-size: 2rem;
	}

	h2 {
		margin: 2rem 0 0.75rem;
		padding-bottom: 0.25rem;
		font-size: 1.05rem;
		border-bottom: 2px solid var(--color-accent);
	}

	.contact {
		margin: 0;
	}

	.download {
		font-weight: bold;
	}

	.entry + .entry {
		margin-top: 1.25rem;
	}

	.entry-head {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0 1rem;
	}

	.entry ul {
		margin: 0.4rem 0 0;
		padding-left: 1.25rem;
	}

	.skills {
		margin: 0;
	}

	.skills div + div {
		margin-top: 0.35rem;
	}

	dt {
		display: inline;
		font-weight: bold;
	}

	dt::after {
		content: ": ";
	}

	dd {
		display: inline;
		margin: 0;
	}
</style>
```

- [ ] **Step 3: Replace `src/pages/contact.astro`**

```astro
---
import Layout from "../layouts/Layout.astro";
import { resume } from "../lib/resume-data";
import { displayUrl } from "../lib/resume";

const { email, linkedin, github } = resume.contact;
const links = [
	{ label: "Email", href: `mailto:${email}`, text: email },
	{ label: "LinkedIn", href: linkedin, text: displayUrl(linkedin) },
	{ label: "GitHub", href: github, text: displayUrl(github) },
];
---

<Layout title="Contact" description="Get in touch with Minh Le.">
	<h1 class="page-title">Contact</h1>
	<p>I'm looking for Summer 2027 software engineering internships. Email is the fastest way to reach me.</p>

	<dl class="contact">
		{
			links.map((l) => (
				<div>
					<dt>{l.label}</dt>
					<dd>
						<a href={l.href} rel={l.label === "Email" ? undefined : "me"}>
							{l.text}
						</a>
					</dd>
				</div>
			))
		}
		<div>
			<dt>Résumé</dt>
			<dd><a href="/resume/">Web</a> · <a href="/resume.pdf">PDF</a></dd>
		</div>
	</dl>
</Layout>

<style>
	.contact {
		display: grid;
		gap: 0.75rem;
		margin: 1.5rem 0 0;
	}

	.contact div {
		display: grid;
		grid-template-columns: 7rem 1fr;
		gap: 1rem;
		align-items: baseline;
	}

	dt {
		font-family: var(--font-heading);
		font-size: 0.85rem;
		text-transform: uppercase;
	}

	dd {
		margin: 0;
		overflow-wrap: anywhere;
	}

	@media (max-width: 480px) {
		.contact div {
			grid-template-columns: 1fr;
			gap: 0;
		}
	}
</style>
```

- [ ] **Step 4: Verify**

```bash
npm run typecheck && npm run build
grep -rcE '867-5309|\(555\)' dist | grep -v ':0'    # Expected: no output (no phone anywhere in the built site)
grep -c '<form' dist/contact/index.html            # Expected: 0
astro dev --background
```

In a browser:
- `/work/` shows 3 cards, VisioneerIT first.
- `/resume/` is a single plain column, and "Download PDF" downloads the phone-free PDF.
- `/contact/` links all work, and the layout holds at a 375px width.

Then run `astro dev stop`.

- [ ] **Step 5: Write `docs/learning/04-resume-pages.md`**

Key concepts: importing typed JSON into Astro frontmatter; build-time rendering with `.map()` in templates; semantic HTML for data (`<ol>`, `<dl>`, `<article>`); one data source, two presentations; `rel="me"`; `download` attribute; responsive layout without media-query sprawl (flex-wrap, grid).
Exercise: add a "Current" badge to any role whose `endDate` is empty. Check: temporarily blank `endDate` in a local copy of the JSON and confirm the badge appears, then revert.

- [ ] **Step 6: Commit; ⚠ optional go-live with the owner's go-ahead**

```bash
git add src/pages/work.astro src/pages/resume.astro src/pages/contact.astro docs/learning/04-resume-pages.md
git commit -m "feat: work experience, résumé and contact pages from synced résumé data"
```

The site is recruiter-usable from here. Ask the owner whether to fast-forward `main` and push now (same commands as Task 2 Step 5, minus the Pages setup).

---

### Task 6: Projects (#6)

**Files:**
- Create: `src/lib/projects.ts`
- Test: `src/lib/projects.test.ts`
- Create: `src/content.config.ts`
- Create: `src/components/Window.astro`
- Create: `src/components/ProjectLogo.astro`
- Delete: `src/pages/projects.astro` → Create: `src/pages/projects/index.astro`
- Create: `src/pages/projects/[slug].astro`
- Create (seeded): `src/content/projects/*.md` (8 files)
- Create: `docs/learning/05-projects.md`

**Interfaces:**
- Consumes: `npm run sync-resume -- --seed-projects` (Task 4).
- Produces:
  - `sortProjects<T extends { data: { featured: boolean; order?: number; title: string } }>(projects: readonly T[]): T[]`
  - `monogram(title: string): string`
  - collection `projects` with schema fields `title, description, techStack, repoUrl?, liveUrl?, logo?, featured, order?, date?`
  - `Window` props `{ title: string; href?: string; headingLevel?: 2 | 3 }` + default slot
  - `ProjectLogo` props `{ title: string; logo?: ImageMetadata; size?: number }`

- [ ] **Step 1: Write the failing tests in `src/lib/projects.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { monogram, sortProjects } from './projects';

const p = (title: string, featured = false, order?: number) => ({ id: title, data: { title, featured, order } });

describe('sortProjects', () => {
	it('puts featured projects first, then sorts by order, then by title', () => {
		const sorted = sortProjects([p('C', false, 2), p('B', true, 5), p('A', false, 1), p('D', true, 1)]);
		expect(sorted.map((x) => x.id)).toEqual(['D', 'B', 'A', 'C']);
	});

	it('puts projects without an order after ordered ones, alphabetically', () => {
		const sorted = sortProjects([p('Zed'), p('Alpha'), p('Mid', false, 3)]);
		expect(sorted.map((x) => x.id)).toEqual(['Mid', 'Alpha', 'Zed']);
	});

	it('does not mutate its input', () => {
		const input = [p('B', false, 2), p('A', false, 1)];
		sortProjects(input);
		expect(input.map((x) => x.id)).toEqual(['B', 'A']);
	});
});

describe('monogram', () => {
	it('uses the initials of a multi-word name, ignoring the subtitle', () => {
		expect(monogram('Pkmn-Quant - Algorithmic Trading Backtester')).toBe('PQ');
		expect(monogram('Dragon Shell - Custom Shell and TCP Server')).toBe('DS');
	});

	it('uses the first two letters of a single-word name', () => {
		expect(monogram('OpenTelemetry (Open Source Contributor)')).toBe('OP');
		expect(monogram('Stylify - Virtual Wardrobe App')).toBe('ST');
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/projects.test.ts`
Expected: FAIL. `Failed to resolve import "./projects"`.

- [ ] **Step 3: Implement `src/lib/projects.ts`**

```ts
interface Sortable {
	data: { featured: boolean; order?: number; title: string };
}

const rank = (order?: number) => order ?? Number.MAX_SAFE_INTEGER;

/** Featured first, then by `order` (missing = last), then alphabetically by title. */
export const sortProjects = <T extends Sortable>(projects: readonly T[]): T[] =>
	[...projects].sort(
		(a, b) =>
			Number(b.data.featured) - Number(a.data.featured) ||
			rank(a.data.order) - rank(b.data.order) ||
			a.data.title.localeCompare(b.data.title),
	);

/** Two-letter fallback badge for projects without a logo: "Pkmn-Quant - …" → "PQ". */
export const monogram = (title: string): string => {
	const name = title.split(/ [-–(]/)[0];
	const words = name.split(/[\s-]+/).filter(Boolean);
	return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Create `src/content.config.ts`**

```ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
	loader: glob({ pattern: '*.md', base: './src/content/projects' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			techStack: z.array(z.string()).min(1),
			repoUrl: z.url().optional(),
			liveUrl: z.url().optional(),
			/** Path relative to the .md file, e.g. ./logos/pkmn-quant.png */
			logo: image().optional(),
			featured: z.boolean().default(false),
			order: z.number().int().optional(),
			date: z.coerce.date().optional(),
		}),
});

export const collections = { projects };
```

- [ ] **Step 6: Seed the project files**

```bash
npm run sync-resume -- --seed-projects
```
Expected: `✓ seeded projects: pkmn-quant, opentelemetry, harbor, sightlink, dragon-shell, socialgym, stylify, du-professorview`

Then run it again and confirm: `✓ projects: every résumé project already has a file`.

Then check that deletes are respected (Review Focus 4):
```bash
mv src/content/projects/stylify.md /tmp/stylify.md && npm run sync-resume && test ! -e src/content/projects/stylify.md && echo "delete respected"
mv /tmp/stylify.md src/content/projects/stylify.md
```

- [ ] **Step 7: Create `src/components/Window.astro`**

```astro
---
interface Props {
	title: string;
	/** When set, the whole window is a link. Don't put other links inside it. */
	href?: string;
	headingLevel?: 2 | 3;
}

const { title, href, headingLevel = 2 } = Astro.props;
const Tag = href ? "a" : "section";
const Heading = `h${headingLevel}` as "h2" | "h3";
---

<Tag class="window" href={href}>
	<div class="titlebar">
		<Heading class="title">{title}</Heading>
		<span class="controls" aria-hidden="true"><span></span><span></span><span></span></span>
	</div>
	<div class="body">
		<slot />
	</div>
</Tag>

<style>
	.window {
		display: flex;
		flex-direction: column;
		height: 100%;
		color: var(--color-foreground);
		text-decoration: none;
		background: var(--color-surface);
		border: 3px solid var(--color-foreground);
		box-shadow: 6px 6px 0 var(--color-foreground);
		transition:
			transform 120ms ease,
			box-shadow 120ms ease;
	}

	a.window:hover,
	a.window:focus-visible {
		outline: none;
		transform: translate(-2px, -2px);
		box-shadow: 8px 8px 0 var(--color-accent);
	}

	a.window:focus-visible {
		border-color: var(--color-accent);
	}

	.titlebar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.35rem 0.6rem;
		background: var(--color-accent);
		color: var(--color-on-accent);
		border-bottom: 3px solid var(--color-foreground);
	}

	.title {
		margin: 0;
		font-size: 0.9rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.controls {
		display: flex;
		flex-shrink: 0;
		gap: 4px;
	}

	.controls span {
		width: 10px;
		height: 10px;
		background: var(--color-on-accent);
		border: 2px solid var(--color-foreground);
	}

	.body {
		flex: 1;
		padding: 1rem;
	}
</style>
```

- [ ] **Step 8: Create `src/components/ProjectLogo.astro`**

```astro
---
import type { ImageMetadata } from "astro";
import { Image } from "astro:assets";
import { monogram } from "../lib/projects";

interface Props {
	title: string;
	logo?: ImageMetadata;
	size?: number;
}

const { title, logo, size = 64 } = Astro.props;
---

{
	logo ? (
		<Image src={logo} alt="" width={size} height={size} class="logo" style={`--size: ${size}px`} />
	) : (
		<span class="logo monogram" aria-hidden="true" style={`--size: ${size}px`}>
			{monogram(title)}
		</span>
	)
}

<style>
	.logo {
		display: inline-grid;
		place-items: center;
		width: var(--size);
		height: var(--size);
		object-fit: contain;
		flex-shrink: 0;
	}

	.monogram {
		font-family: var(--font-heading);
		font-size: calc(var(--size) * 0.36);
		color: var(--color-on-accent);
		background: var(--color-accent);
		border: 3px solid var(--color-foreground);
	}
</style>
```

- [ ] **Step 9: Move the stub and create `src/pages/projects/index.astro`**

```bash
git rm src/pages/projects.astro && mkdir -p src/pages/projects
```

```astro
---
import { getCollection } from "astro:content";
import Layout from "../../layouts/Layout.astro";
import Window from "../../components/Window.astro";
import ProjectLogo from "../../components/ProjectLogo.astro";
import { sortProjects } from "../../lib/projects";

const projects = sortProjects(await getCollection("projects"));
---

<Layout title="Projects" description="Projects and open-source contributions by Minh Le.">
	<h1 class="page-title">Projects</h1>

	<ul class="grid">
		{
			projects.map((project) => (
				<li>
					<Window title={project.data.title} href={`/projects/${project.id}/`}>
						<div class="screen">
							<ProjectLogo title={project.data.title} logo={project.data.logo} size={56} />
							{project.data.featured && <span class="featured">★ Featured</span>}
						</div>
						<p class="description">{project.data.description}</p>
						<ul class="tag-list" aria-label="Tech stack">
							{project.data.techStack.map((tech) => (
								<li class="tag">{tech}</li>
							))}
						</ul>
					</Window>
				</li>
			))
		}
	</ul>
</Layout>

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr));
		gap: 1.75rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.grid > li {
		max-width: none;
	}

	.screen {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem;
		margin-bottom: 0.75rem;
		background: var(--color-background);
		border: 2px solid var(--color-border);
	}

	.featured {
		font-family: var(--font-heading);
		font-size: 0.7rem;
		text-transform: uppercase;
		color: var(--color-accent);
	}

	.description {
		display: -webkit-box;
		margin: 0 0 0.75rem;
		overflow: hidden;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
		line-clamp: 3;
	}
</style>
```

- [ ] **Step 10: Create `src/pages/projects/[slug].astro`**

```astro
---
import type { InferGetStaticPropsType } from "astro";
import { getCollection, render } from "astro:content";
import Layout from "../../layouts/Layout.astro";
import ProjectLogo from "../../components/ProjectLogo.astro";

export async function getStaticPaths() {
	const projects = await getCollection("projects");
	return projects.map((project) => ({ params: { slug: project.id }, props: { project } }));
}

type Props = InferGetStaticPropsType<typeof getStaticPaths>;

const { project } = Astro.props as Props;
const { title, description, techStack, repoUrl, liveUrl, logo } = project.data;
const { Content } = await render(project);
---

<Layout title={title} description={description}>
	<p><a href="/projects/">← All projects</a></p>
	<header class="head">
		<ProjectLogo title={title} logo={logo} size={80} />
		<div>
			<h1>{title}</h1>
			<ul class="tag-list" aria-label="Tech stack">
				{techStack.map((tech) => <li class="tag">{tech}</li>)}
			</ul>
		</div>
	</header>

	{
		(repoUrl || liveUrl) && (
			<p class="links">
				{repoUrl && <a href={repoUrl}>Source code ↗</a>}
				{repoUrl && liveUrl && " · "}
				{liveUrl && <a href={liveUrl}>Live demo ↗</a>}
			</p>
		)
	}

	<div class="body">
		<Content />
	</div>
</Layout>

<style>
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1.25rem;
		margin: 1rem 0 1.5rem;
	}

	h1 {
		margin: 0 0 0.5rem;
		font-size: clamp(1.4rem, 4vw, 2rem);
	}

	.links {
		font-weight: bold;
	}

	.body {
		max-width: 70ch;
	}
</style>
```

- [ ] **Step 11: Verify, including that schema validation fails bad content**

```bash
npm run typecheck && npm run build    # Expected: 13+ pages, including 8 under /projects/
printf -- '---\ntitle: "Broken"\n---\n' > src/content/projects/zz-broken.md
npm run build; echo "exit=$?"         # Expected: non-zero exit, error mentions description / techStack
rm src/content/projects/zz-broken.md
astro dev --background
```

In a browser:
- The `/projects/` grid shows 8 windows in résumé order, with monograms in place of logos.
- Clicking one opens its page, which renders the bullets.
- Set `featured: true` on `sightlink.md`, confirm it jumps to first with "★ Featured", then revert it.

Then run `astro dev stop`.

If `z.url()` is rejected by `astro check`, use `z.string().url()` instead.

- [ ] **Step 12: Write `docs/learning/05-projects.md`**

Key concepts: Content Collections (`content.config.ts`, `glob` loader, entry `id` = filename slug); Zod schemas and build-time validation (show the broken-entry error); `image()` schema helper + `astro:assets` `<Image>`; `getStaticPaths` + `render()` for dynamic routes; `InferGetStaticPropsType`; component props and slots (`Window`); why the whole window is the link (no nested `<a>`); intrinsic responsive grid (`auto-fill` + `minmax(min(100%, …))`); a pure sort function vs sorting inline.
Exercise (adds a real logo): put a PNG at `src/content/projects/logos/pkmn-quant.png`, add `logo: ./logos/pkmn-quant.png` to `pkmn-quant.md`, and add a `repoUrl`. Check: the grid shows the image, and the detail page shows a "Source code ↗" link.

- [ ] **Step 13: Commit**

```bash
git add -A src/lib/projects.ts src/lib/projects.test.ts src/content.config.ts src/components src/pages/projects src/content/projects docs/learning/05-projects.md
git commit -m "feat: projects collection, window-styled grid and per-project pages"
```

---

### Task 7: Blog (#7)

**Files:**
- Create: `src/lib/blog.ts`
- Test: `src/lib/blog.test.ts`
- Create: `src/lib/content.ts`
- Modify: `src/content.config.ts`
- Create: `src/content/blog/.gitkeep`
- Delete: `src/pages/blog.astro` → Create: `src/pages/blog/index.astro`
- Create: `src/pages/blog/[slug].astro`
- Create: `docs/learning/06-blog.md`

**Interfaces:**
- Produces:
  - `filterPostsByTag<T extends { tags: readonly string[] }>(posts: readonly T[], tag: string | null): T[]`
  - `collectTags(posts: readonly { tags: readonly string[] }[]): string[]` (sorted, unique)
  - `sortPostsNewestFirst<T extends { data: { date: Date } }>(posts: readonly T[]): T[]`
  - `getVisiblePosts(): Promise<CollectionEntry<'blog'>[]>`: drafts included only in `astro dev`; newest first.

- [ ] **Step 1: Write the failing tests in `src/lib/blog.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { collectTags, filterPostsByTag, sortPostsNewestFirst } from './blog';

const posts = [
	{ id: 'a', tags: ['go', 'infra'] },
	{ id: 'b', tags: ['ai'] },
	{ id: 'c', tags: ['go'] },
];

describe('filterPostsByTag', () => {
	it('returns the posts that have the tag', () => {
		expect(filterPostsByTag(posts, 'go').map((p) => p.id)).toEqual(['a', 'c']);
	});

	it('returns an empty list when nothing matches', () => {
		expect(filterPostsByTag(posts, 'rust')).toEqual([]);
	});

	it('returns every post when no tag is selected', () => {
		expect(filterPostsByTag(posts, null).map((p) => p.id)).toEqual(['a', 'b', 'c']);
		expect(filterPostsByTag(posts, '').map((p) => p.id)).toEqual(['a', 'b', 'c']);
	});

	it('handles posts with no tags', () => {
		expect(filterPostsByTag([{ tags: [] }], 'go')).toEqual([]);
	});
});

describe('collectTags', () => {
	it('returns unique tags sorted alphabetically', () => {
		expect(collectTags(posts)).toEqual(['ai', 'go', 'infra']);
	});

	it('returns an empty list for no posts', () => {
		expect(collectTags([])).toEqual([]);
	});
});

describe('sortPostsNewestFirst', () => {
	it('orders by date descending without mutating the input', () => {
		const input = [
			{ id: 'old', data: { date: new Date('2026-01-01') } },
			{ id: 'new', data: { date: new Date('2026-09-01') } },
		];
		expect(sortPostsNewestFirst(input).map((p) => p.id)).toEqual(['new', 'old']);
		expect(input[0].id).toBe('old');
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/blog.test.ts`
Expected: FAIL. `Failed to resolve import "./blog"`.

- [ ] **Step 3: Implement `src/lib/blog.ts`**

```ts
/** Posts carrying `tag`; every post when no tag is selected (null or ""). */
export const filterPostsByTag = <T extends { tags: readonly string[] }>(posts: readonly T[], tag: string | null): T[] =>
	tag ? posts.filter((post) => post.tags.includes(tag)) : [...posts];

/** Every tag used by any post, unique and sorted. */
export const collectTags = (posts: readonly { tags: readonly string[] }[]): string[] =>
	[...new Set(posts.flatMap((post) => post.tags))].sort();

export const sortPostsNewestFirst = <T extends { data: { date: Date } }>(posts: readonly T[]): T[] =>
	[...posts].sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Add the `blog` collection; replace `src/content.config.ts` with:**

```ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
	loader: glob({ pattern: '*.md', base: './src/content/projects' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			techStack: z.array(z.string()).min(1),
			repoUrl: z.url().optional(),
			liveUrl: z.url().optional(),
			/** Path relative to the .md file, e.g. ./logos/pkmn-quant.png */
			logo: image().optional(),
			featured: z.boolean().default(false),
			order: z.number().int().optional(),
			date: z.coerce.date().optional(),
		}),
});

const blog = defineCollection({
	loader: glob({ pattern: '*.md', base: './src/content/blog' }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		date: z.coerce.date(),
		tags: z.array(z.string()).default([]),
		draft: z.boolean().default(false),
	}),
});

export const collections = { projects, blog };
```

(Keep whatever `projects` URL validator Task 6 ended up using.)

```bash
mkdir -p src/content/blog && touch src/content/blog/.gitkeep
```

- [ ] **Step 6: Create `src/lib/content.ts`**

```ts
import { getCollection } from 'astro:content';
import { sortPostsNewestFirst } from './blog';

/** Published posts, newest first. Drafts show only in `astro dev`, never in a production build. */
export const getVisiblePosts = async () =>
	sortPostsNewestFirst(await getCollection('blog', ({ data }) => import.meta.env.DEV || !data.draft));
```

- [ ] **Step 7: Move the stub and create `src/pages/blog/index.astro`**

```bash
git rm src/pages/blog.astro && mkdir -p src/pages/blog
```

```astro
---
import Layout from "../../layouts/Layout.astro";
import { collectTags } from "../../lib/blog";
import { getVisiblePosts } from "../../lib/content";

const posts = await getVisiblePosts();
const tags = collectTags(posts.map((post) => post.data));
const formatDate = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });
---

<Layout title="Blog" description="Engineering writing by Minh Le.">
	<h1 class="page-title">Blog</h1>

	{
		posts.length === 0 ? (
			<p class="empty">
				Posts coming soon. In the meantime, have a look at my <a href="/projects/">projects</a>.
			</p>
		) : (
			<>
				{tags.length > 0 && (
					<div class="filters" role="group" aria-label="Filter posts by tag">
						<button type="button" data-tag="" aria-pressed="true">
							All
						</button>
						{tags.map((tag) => (
							<button type="button" data-tag={tag} aria-pressed="false">
								{tag}
							</button>
						))}
					</div>
				)}

				<ol class="posts">
					{posts.map((post) => (
						<li data-tags={JSON.stringify(post.data.tags)}>
							<article>
								<h2>
									<a href={`/blog/${post.id}/`}>{post.data.title}</a>
								</h2>
								<p class="muted">
									<time datetime={post.data.date.toISOString()}>{formatDate.format(post.data.date)}</time>
									{post.data.draft && " · DRAFT"}
								</p>
								<p>{post.data.description}</p>
								<ul class="tag-list" aria-label="Tags">
									{post.data.tags.map((tag) => (
										<li class="tag">{tag}</li>
									))}
								</ul>
							</article>
						</li>
					))}
				</ol>
				<p class="no-match" hidden>
					No posts with that tag.
				</p>
			</>
		)
	}
</Layout>

<script>
	import { filterPostsByTag } from "../../lib/blog";

	const items = [...document.querySelectorAll<HTMLLIElement>("ol.posts > li")].map((el) => ({
		el,
		tags: JSON.parse(el.dataset.tags ?? "[]") as string[],
	}));
	const buttons = [...document.querySelectorAll<HTMLButtonElement>(".filters button")];
	const noMatch = document.querySelector<HTMLElement>(".no-match");

	const apply = (tag: string | null) => {
		const visible = new Set(filterPostsByTag(items, tag));
		for (const item of items) item.el.hidden = !visible.has(item);
		for (const button of buttons) button.setAttribute("aria-pressed", String((button.dataset.tag || null) === tag));
		if (noMatch) noMatch.hidden = visible.size > 0;

		const url = new URL(location.href);
		if (tag) url.searchParams.set("tag", tag);
		else url.searchParams.delete("tag");
		history.replaceState(null, "", url);
	};

	for (const button of buttons) button.addEventListener("click", () => apply(button.dataset.tag || null));

	// Shareable ?tag= links; an unknown tag is ignored so the page never opens empty.
	const initial = new URL(location.href).searchParams.get("tag");
	if (initial && items.some((item) => item.tags.includes(initial))) apply(initial);
</script>

<style>
	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}

	.filters button {
		padding: 0.3rem 0.8rem;
		font: inherit;
		font-size: 0.9rem;
		color: var(--color-foreground);
		background: var(--color-surface);
		border: 2px solid var(--color-foreground);
		cursor: pointer;
	}

	.filters button[aria-pressed="true"] {
		background: var(--color-accent);
		color: var(--color-on-accent);
	}

	.posts {
		display: grid;
		gap: 1.75rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	h2 {
		margin: 0;
		font-size: 1.2rem;
	}

	article p {
		margin: 0.25rem 0 0.5rem;
	}
</style>
```

- [ ] **Step 8: Create `src/pages/blog/[slug].astro`**

```astro
---
import type { InferGetStaticPropsType } from "astro";
import { render } from "astro:content";
import Layout from "../../layouts/Layout.astro";
import { getVisiblePosts } from "../../lib/content";

export async function getStaticPaths() {
	const posts = await getVisiblePosts();
	return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
}

type Props = InferGetStaticPropsType<typeof getStaticPaths>;

const { post } = Astro.props as Props;
const { Content } = await render(post);
const formatDate = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" });
---

<Layout title={post.data.title} description={post.data.description}>
	<p><a href="/blog/">← All posts</a></p>
	<article class="post">
		<h1>{post.data.title}</h1>
		<p class="muted">
			<time datetime={post.data.date.toISOString()}>{formatDate.format(post.data.date)}</time>
		</p>
		<Content />
	</article>
</Layout>

<style>
	.post {
		max-width: 70ch;
	}

	h1 {
		margin-bottom: 0.25rem;
		font-size: clamp(1.4rem, 4vw, 2rem);
	}
</style>
```

- [ ] **Step 9: Verify the empty state, then the filter and draft exclusion with throwaway posts**

```bash
npm run typecheck && npm run build && grep -c "Posts coming soon" dist/blog/index.html   # Expected: 1
cat > src/content/blog/zz-public.md <<'EOF'
---
title: "Throwaway public"
description: "test"
date: 2026-10-01
tags: ["go"]
---
Hello.
EOF
cat > src/content/blog/zz-draft.md <<'EOF'
---
title: "Throwaway draft"
description: "test"
date: 2026-10-02
tags: ["ai"]
draft: true
---
Secret.
EOF
npm run build
test -e dist/blog/zz-public/index.html && echo "public page built"
test ! -e dist/blog/zz-draft/index.html && echo "draft page NOT built"
grep -c "Throwaway draft" dist/blog/index.html     # Expected: 0
astro dev --background
```

In the browser at `/blog/` (dev mode shows drafts, marked "DRAFT"):
- Clicking the `go` tag hides the draft and updates the URL to `?tag=go`.
- Loading `/blog/?tag=nope` shows all posts.

Then:
```bash
astro dev stop
rm src/content/blog/zz-public.md src/content/blog/zz-draft.md
```

- [ ] **Step 10: Write `docs/learning/06-blog.md`**

Key concepts: collection filter callbacks and `import.meta.env.DEV`; why drafts are filtered in one shared helper (`getVisiblePosts`) used by both the index and `getStaticPaths`; progressive enhancement (all posts render without JS, and the script only hides); `data-*` attributes as the server→client bridge; reusing a pure function in the browser; `aria-pressed` filter buttons; `history.replaceState` for shareable state; `Intl.DateTimeFormat` with `timeZone: "UTC"` (why dates otherwise shift by a day).
Exercise: write the first real post (any topic from the résumé, e.g. the Pkmn-Quant 1.9x hot-path rewrite) with `draft: true`, preview it in dev, then flip it to `draft: false`. Check: it appears in `npm run build` output and on the homepage Blog window count after Task 8.

- [ ] **Step 11: Commit**

```bash
git add -A src/lib/blog.ts src/lib/blog.test.ts src/lib/content.ts src/content.config.ts src/content/blog/.gitkeep src/pages/blog docs/learning/06-blog.md
git commit -m "feat: blog collection with tag filter, draft handling and empty state"
```

---

### Task 8: Desktop homepage (#4)

**Files:**
- Modify: `src/pages/index.astro`
- Create: `docs/learning/07-desktop-homepage.md`

**Interfaces:**
- Consumes: `Window` (Task 6), `sortProjects` (Task 6), `getVisiblePosts` (Task 7), `resume` (Task 4).

- [ ] **Step 1: Replace `src/pages/index.astro`**

```astro
---
import { getCollection } from "astro:content";
import Layout from "../layouts/Layout.astro";
import Window from "../components/Window.astro";
import { getVisiblePosts } from "../lib/content";
import { sortProjects } from "../lib/projects";
import { resume } from "../lib/resume-data";

const projects = sortProjects(await getCollection("projects"));
const posts = await getVisiblePosts();
const [latestRole] = resume.experience;
---

<Layout title="Home">
	<section class="intro">
		<h1 class="page-title">{resume.name}</h1>
		<p class="tagline">
			Software engineering student at Drexel University building backend, infrastructure, and applied-AI systems.
			Looking for Summer 2027 internships.
		</p>
	</section>

	<div class="desktop">
		<div class="slot slot-projects">
			<Window title="Projects" href="/projects/">
				<p class="muted">{projects.length} projects &amp; open-source contributions</p>
				<ul class="preview">
					{projects.slice(0, 3).map((p) => <li>{p.data.title}</li>)}
				</ul>
				<p class="open">Open →</p>
			</Window>
		</div>
		<div class="slot slot-work">
			<Window title="Work Experience" href="/work/">
				{
					latestRole && (
						<p>
							<strong>{latestRole.role}</strong>
							<br />
							{latestRole.company} · {latestRole.startDate} – {latestRole.endDate || "Present"}
						</p>
					)
				}
				<p class="muted">{resume.experience.length} roles</p>
			</Window>
		</div>
		<div class="slot slot-blog">
			<Window title="Blog" href="/blog/">
				<p>{posts.length > 0 ? `${posts.length} post${posts.length === 1 ? "" : "s"}` : "Posts coming soon."}</p>
			</Window>
		</div>
		<div class="slot slot-contact">
			<Window title="Contact" href="/contact/">
				<p class="email">{resume.contact.email}</p>
				<p class="muted">LinkedIn · GitHub · Résumé</p>
			</Window>
		</div>
	</div>
</Layout>

<style>
	.intro {
		margin-bottom: 2rem;
	}

	.tagline {
		font-size: 1.15rem;
	}

	/* The "desktop": dotted wallpaper, windows placed on a 12-column grid. */
	.desktop {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.5rem;
		padding: 1.25rem;
		background-color: var(--color-background);
		background-image: radial-gradient(var(--color-border) 1.5px, transparent 1.5px);
		background-size: 16px 16px;
		border: 3px solid var(--color-foreground);
	}

	.slot p {
		margin: 0 0 0.5rem;
	}

	.preview {
		margin: 0 0 0.5rem;
		padding-left: 1.1rem;
	}

	.open {
		font-family: var(--font-heading);
		font-size: 0.8rem;
		color: var(--color-accent);
	}

	.email {
		overflow-wrap: anywhere;
	}

	/* Below 768px the windows stack in one column (the grid default above). */
	@media (min-width: 768px) {
		.desktop {
			grid-template-columns: repeat(12, 1fr);
			gap: 2rem;
			padding: 2.5rem;
		}

		.slot-projects {
			grid-column: 1 / span 7;
			grid-row: 1 / span 2;
		}

		.slot-work {
			grid-column: 8 / span 5;
			grid-row: 1;
			margin-top: 1.5rem;
		}

		.slot-blog {
			grid-column: 8 / span 4;
			grid-row: 2;
		}

		.slot-contact {
			grid-column: 3 / span 6;
			grid-row: 3;
		}
	}
</style>
```

- [ ] **Step 2: Verify**

```bash
npm run typecheck && npm run build
astro dev --background
```

In a browser at `/`:
- There are 4 windows, and clicking each goes to its page.
- Windows are not draggable.
- Keyboard Tab reaches every window with visible focus.
- At 767px width they stack into one column, and at 1024px they sit in the offset desktop layout.
- Both themes look right.

Then run `astro dev stop`.

- [ ] **Step 3: Write `docs/learning/07-desktop-homepage.md`**

Key concepts: CSS Grid explicit placement (`grid-column` / `grid-row` spans) for a "spatial" layout; mobile-first media queries (single column is the default); CSS-only wallpaper with `radial-gradient` + `background-size`; why placement lives on wrapper `.slot` divs (scoped styles don't reach into child components); deriving every word on the page from data so it never goes stale.
Exercise: add a fifth decorative "README.txt" window (no link) with a one-line bio, placed in the empty grid area. Check: it doesn't break the 767px single-column layout.

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro docs/learning/07-desktop-homepage.md
git commit -m "feat: desktop homepage with four data-driven windows"
```

---

### Task 9: Final verification, issues, launch

**Files:** none new (issue updates are on GitHub).

- [ ] **Step 1: Full verification from a clean install**

```bash
rm -rf node_modules dist && npm ci && npm test && npm run typecheck && npm run build
grep -rlE '867-5309|\(555\)' dist public src || echo "no phone anywhere"
```
Expected: all pass; prints `no phone anywhere`.

- [ ] **Step 2: Manual pass across the site**

`astro preview` (after build), then check each route:
- `/`
- `/projects/` and one `/projects/<slug>/`
- `/work/`, `/resume/`, `/resume.pdf`
- `/blog/`
- `/contact/`

For each, check: light + dark theme, 375px and 1280px widths, and keyboard navigation. Fix anything broken in the task that owns it before continuing.

- [ ] **Step 3: ⚠ Owner go-ahead required: update GitHub issues**

Draft these issue changes, show them to the owner, and only then apply them with `gh issue edit` / `gh issue comment` / `gh issue close`:
- **#1:** replace "Further Notes" collaboration split with a link to the spec; note résumé sync (ADR 0003).
- **#5:** update the AC — data comes from the synced `resume.json`, and the PDF is generated phone-free.
- Close **#2–#8** with a comment citing the commit that completed each.

- [ ] **Step 4: ⚠ Owner go-ahead required: launch**

```bash
git switch main && git merge --ff-only portfolio-v1 && git push origin main
gh run watch --exit-status $(gh run list --workflow deploy.yml --limit 1 --json databaseId -q '.[0].databaseId')
for p in / /projects/ /work/ /resume/ /resume.pdf /blog/ /contact/; do printf "%s " $p; curl -so /dev/null -w "%{http_code}\n" https://mlhv.github.io$p; done
```
Expected: the workflow succeeds, and every route returns `200`.

---

## Owner's ongoing workflow (after launch)

- **Résumé changed:** run `npm run sync-resume`, then commit `src/data/resume.json` and `public/resume.pdf`, then push.
- **New or changed project:** edit or copy a file in `src/content/projects/`, then push. If you added the project to your résumé first, `npm run sync-resume -- --seed-projects` creates a starter file for it.
- **New post:** add `src/content/blog/<slug>.md` with `draft: true`, preview it with `astro dev --background`, flip it to `draft: false`, then push.
