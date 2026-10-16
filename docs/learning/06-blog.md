# 06 — Blog

## What we built

- A `blog` content collection (`src/content.config.ts`) with `title`, `description`, `date`, `tags` and `draft`, loaded from `src/content/blog/*.md`.
- Pure helpers in `src/lib/blog.ts` (`filterPostsByTag`, `collectTags`, `sortPostsNewestFirst`) covered by `src/lib/blog.test.ts`.
- `getVisiblePosts()` in `src/lib/content.ts`: the one place that decides which posts are visible, newest first.
- A blog index at `/blog/` with tag filter buttons and an empty state, plus a page per post at `/blog/<slug>/`.
- Drafts show (marked "DRAFT") in `astro dev` and are never built into production.

## Key concepts

### Collection filter callbacks and `import.meta.env.DEV`
`getCollection('blog', ({ data }) => import.meta.env.DEV || !data.draft)` filters entries as they load. `import.meta.env.DEV` is true under `astro dev` and false in `astro build`, so drafts are previewable but never shipped.

### One shared helper for drafts
Both `src/pages/blog/index.astro` and `getStaticPaths` in `[slug].astro` call `getVisiblePosts()`. If each filtered on its own, one could forget and publish a draft page that the index hides.

### Progressive enhancement
Every post renders in the HTML with no JavaScript. The script in `index.astro` only hides items, so with JS off the page still shows all posts.

### `data-*` attributes as the server to client bridge
Each `<li>` carries `data-tags={JSON.stringify(post.data.tags)}`. The browser script reads `el.dataset.tags`, so it needs no build-time data of its own.

### Reusing a pure function in the browser
The script imports `filterPostsByTag` from `src/lib/blog.ts`, the same function the unit tests cover. Astro bundles it into the page.

### `aria-pressed` filter buttons
Each filter button is a real `<button type="button">` whose `aria-pressed` tells assistive tech which filter is active; the same attribute drives the active styling.

### `history.replaceState` for shareable state
Selecting a tag updates the URL to `?tag=go` without adding history entries. On load, a `?tag=` that matches a real tag is applied; an unknown tag is ignored so the page never opens empty.

### `Intl.DateTimeFormat` with `timeZone: "UTC"`
Front matter dates like `2026-10-01` parse as UTC midnight. Formatting in the viewer's local zone would show Sept 30 for anyone west of UTC, so formatting pins `timeZone: "UTC"`.

## Why it's done this way

Visibility rules live in one tested-by-use helper, pure logic lives in unit-tested functions shared by server and browser, and the page works without JavaScript. The empty state keeps the page honest until the first post exists.

## Try it yourself

Exercise: write the first real post (any topic from the résumé, e.g. the Pkmn-Quant 1.9x hot-path rewrite) with `draft: true`, preview it in dev, then flip it to `draft: false`.
Hint: files go in `src/content/blog/`, and the filename becomes the URL slug.
Check: it appears in `npm run build` output and on the homepage Blog window count after Task 8.

## Interview angle

I kept draft handling in one shared helper so the index and the generated routes can never disagree, and reused the same tested pure filter function on the server and in the browser.
