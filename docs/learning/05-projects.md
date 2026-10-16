# 05 — Projects

## What we built

- A `projects` content collection (`src/content.config.ts`) with a Zod schema, fed by eight Markdown files seeded from the résumé into `src/content/projects/`.
- Pure helpers in `src/lib/projects.ts`: `sortProjects` (featured, then `order`, then title) and `monogram` (two-letter fallback badge), covered by `src/lib/projects.test.ts`.
- A reusable `Window` component (retro title bar, default slot, optional `href`) and a `ProjectLogo` component (real image or monogram).
- A responsive grid at `/projects/` and one detail page per project at `/projects/<slug>/`.
- Build-time validation: a project missing `description` or `techStack` fails the build.

## Key concepts

### Content Collections
`src/content.config.ts` declares the collection with the `glob` loader (`pattern: '*.md'`, `base: './src/content/projects'`). Each entry's `id` is its filename without extension, so `sightlink.md` becomes `sightlink` and the URL `/projects/sightlink/`.

### Zod schemas and build-time validation
The schema describes front matter. Adding a file with only `title:` makes `npm run build` exit non-zero with `InvalidContentEntryDataError ... description: Required, techStack: Required`. Bad content never reaches production.

### `image()` and `astro:assets`
`logo: image().optional()` resolves a path relative to the `.md` file (e.g. `./logos/pkmn-quant.png`) into image metadata, which `<Image>` in `ProjectLogo.astro` optimises at build time.

### `getStaticPaths` and `render()`
`src/pages/projects/[slug].astro` returns one `{ params, props }` per entry; `render(project)` gives a `Content` component for the Markdown body. `InferGetStaticPropsType` types the props from that function.

### Props and slots
`Window` takes `{ title, href?, headingLevel? }` and a default `<slot />`, so the same chrome wraps any content (Task 8 reuses it).

### Why the whole window is the link
With `href`, `Window` renders an `<a>` instead of a `<section>`. One big link is a large click target and avoids invalid nested `<a>` elements, so cards must not contain other links.

### Intrinsic responsive grid
`repeat(auto-fill, minmax(min(100%, 18rem), 1fr))` fits as many columns as space allows with no media queries; `min(100%, ...)` stops overflow on narrow phones.

### Pure sort function vs inline sorting
`sortProjects` copies the array, takes plain data, and is unit tested. Sorting inline in the page would be untestable and easy to mutate by accident.

## Why it's done this way

Content lives in Markdown, structure in a validated schema, logic in tested pure functions, and presentation in components. The seed script never overwrites existing files, so hand edits to project text are safe.

## Try it yourself

Exercise: put a PNG at `src/content/projects/logos/pkmn-quant.png`, add `logo: ./logos/pkmn-quant.png` and a `repoUrl: "https://github.com/..."` to `pkmn-quant.md`.
Hint: `logo` is a relative path, not a URL; `repoUrl` must be a full URL.
Check: `/projects/` shows the image instead of "PQ", and the detail page shows a "Source code ↗" link.

## Interview angle

I modelled projects as a schema-validated content collection so malformed content fails the build, and kept sorting and badge logic in pure, unit-tested functions.
