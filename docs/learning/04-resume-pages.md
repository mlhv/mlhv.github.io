# 04 — Résumé pages

## What we built
- `src/pages/work.astro`: the Work Experience page, rendering one card per job from `resume.experience`, with VisioneerIT first.
- `src/pages/resume.astro`: a plain single-column résumé page for the web, with a "Download PDF" link to `/resume.pdf`.
- `src/pages/contact.astro`: email, LinkedIn, GitHub and résumé links, with no form.
- Every page reads the same synced data (`src/lib/resume-data.ts`), so none of them holds a hand-typed copy of the résumé.

## Key concepts

### Importing typed JSON into Astro frontmatter
Each page starts with `import { resume } from "../lib/resume-data";`. That module re-exports `src/data/resume.json` typed as `SiteResume`, so `resume.experience` has a known shape and `astro check` fails if the JSON drifts. Frontmatter (the `---` block) runs at build time, so the import never reaches the browser.

### Build-time rendering with `.map()`
The template turns arrays into markup with plain JavaScript: `resume.experience.map((job) => (<li class="role">…</li>))`. Astro renders this to static HTML during `astro build`, so `dist/work/index.html` already contains the three cards. There is no client-side JavaScript to load.

### Semantic HTML for data
Ordered jobs use `<ol>`, the skills list uses `<dl>` (term and description pairs such as "Languages: …"), and the résumé body is an `<article>`. Screen readers and search engines read this structure, and the CSS can target it without extra class names.

### One data source, two presentations
`/work/` is a card summary, and `/resume/` is the full document. Both read `resume.experience`, so a fix in the résumé repo, followed by `npm run sync-resume`, updates both pages at once.

### `rel="me"`
`rel="me"` on the LinkedIn and GitHub links marks them as the same person as the site owner. Identity-aware tools such as IndieWeb and Mastodon use it to verify ownership. The email link leaves `rel` unset because `mailto:` is not a profile.

### The `download` attribute
`<a href="/resume.pdf" download>` asks the browser to save the file instead of opening it. The file name comes from the path. Without `download`, a PDF usually opens in the viewer tab.

### Responsive layout without media-query sprawl
Flex-wrap handles the job meta line, so `.meta` wraps when the page narrows. The contact list is a two-column grid, and one `@media (max-width: 480px)` rule stacks it on phones. The résumé and work pages need no other breakpoints.

## Why it's done this way
A recruiter reads these pages in different contexts: a card list on `/work/` for a quick skim, the full document for detail, and a PDF for attaching to an application. Rendering all three from the same synced data keeps them consistent. Build-time rendering means the pages are static files on GitHub Pages, with no runtime data fetch to break. The phone number never reaches these pages because the sync step removes it before the data is written.

## Try it yourself
Add a "Current" badge to any role whose `endDate` is empty.

Hint: in `src/pages/work.astro`, put a conditional `<span class="badge">Current</span>` next to the company name when `job.endDate` is falsy. Style it with the existing theme tokens.

Check: temporarily blank one `endDate` in a local copy of `src/data/resume.json`, run `npm run dev`, and confirm the badge appears. Then revert the JSON. Do not commit the edit, because that file is generated.

## Interview angle
I kept one typed data source and rendered it into three static pages, so the pages cannot disagree and no client JavaScript is needed. The sync step strips private data before any page can read it.
