# 07 — Desktop Homepage

## What we built

- `src/pages/index.astro` replaces the temporary stub with a "desktop": an intro (name from `resume.json`, tagline) and four `Window` links to `/projects/`, `/work/`, `/blog/` and `/contact/`.
- Every word that depends on data comes from code: project count and top three titles from `sortProjects(getCollection("projects"))`, role count and latest role from `resume.experience`, post count from `getVisiblePosts()`, and the email from `resume.contact`.
- A blog window that reads "Posts coming soon." while there are no visible posts, so the homepage never shows a stale count.
- A CSS-only desktop: a dotted wallpaper from `radial-gradient`, with the windows placed on a 12-column grid at 768px and up, and stacked in one column below that.

## Key concepts

### CSS Grid explicit placement
At 768px and up, `.desktop` becomes `repeat(12, 1fr)` and each slot names its cells, for example `.slot-projects { grid-column: 1 / span 7; grid-row: 1 / span 2; }`. The windows are placed by coordinates rather than by source order, which gives the offset "scattered windows" look without any absolute positioning.

### Mobile-first media queries
The base `.desktop` rule is a single column with no grid placement. Only `@media (min-width: 768px)` adds the 12-column layout. A phone never has to undo desktop rules, and a broken media query degrades to a readable stack instead of an overlap.

### CSS-only wallpaper
`background-image: radial-gradient(var(--color-border) 1.5px, transparent 1.5px)` paints one dot per tile, and `background-size: 16px 16px` sets the tile size. No image file is downloaded, and the dot colour follows the theme tokens, so it works in light and dark mode.

### Why placement lives on `.slot` wrappers
Astro scoped styles only apply to elements in this component's template. `Window` is a child component, so its root element is not reachable from `index.astro`'s `<style>` block through the child's own scope. Putting the grid placement on a plain `<div class="slot ...">` wrapper keeps it in this file's scope, and `Window` stays unaware of where it sits on the page.

### Deriving every word from data
The tagline is the only hand-written copy on the page. Counts, the latest role and the email all come from the same sources the other pages use, so when `npm run sync-resume` changes `resume.json`, the homepage changes with it.

## Why it's done this way

The homepage is a summary, not a second copy of the content, so it reads from the same modules as the detail pages and cannot drift from them. Placement is kept in CSS and the wrappers are plain divs, so the layout can change without touching the components or their data.

## Try it yourself

Exercise: add a fifth decorative "README.txt" window (no link) with a one-line bio, placed in the empty grid area.
Hint: `Window` makes a `<section>` when `href` is omitted, so you can pass only `title` and a slot. At 768px and up, the empty cells are in row 3, columns 1–2 and 9–12 (the contact window spans columns 3 to 8), plus the space below the Blog window.
Check: `npm run dev` (or `astro dev --background`), then view the page at 767px and at 1024px. At 767px it must still be one column with no overlap, and at 1024px the new window must sit in an empty area of the grid.

## Interview angle

I laid out the page with explicit CSS Grid placement on wrapper divs, and wrote the base styles for a single column with media queries only adding the desktop layout. Every number on the page is derived from the same data modules as the detail pages, so those cannot go stale; the one-line tagline in `src/pages/index.astro` is hand-written.
