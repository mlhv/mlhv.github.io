# 01 — Site shell & theme

## What we built
- `src/layouts/Layout.astro`: one shared page shell (head, fonts, skip link, `<Nav />`, `<main><slot /></main>`).
- `src/styles/theme.css`: design tokens (colors, fonts) as CSS custom properties, plus base styles and shared classes (`.page-title`, `.tag-list`, `.tag`, `.muted`).
- `src/components/Nav.astro`: five-link nav that marks the current page with `aria-current="page"`.
- `src/components/ThemeToggle.astro`: a light/dark button that persists the choice in `localStorage` under `"theme"`.
- Stub pages for all five routes, each with a `.page-title` heading.

## Key concepts

### Astro layouts and `<slot />`
`Layout.astro` wraps every page. Pages write `<Layout title="Blog">…</Layout>` and whatever sits between the tags is rendered where `<slot />` is in `src/layouts/Layout.astro`. Props (`title`, `description?`) are declared in the `Props` interface.

### Scoped `<style>` vs global stylesheet
`<style>` inside `Nav.astro` is scoped to that component. `src/styles/theme.css` is imported once in the layout and is global: it holds tokens and classes used by many pages.

### CSS custom properties as design tokens
Colors live in `:root` as `--color-background`, `--color-accent`, etc. Components only say `var(--color-accent)`, so changing a theme means changing token values, not components.

### `prefers-color-scheme` + `[data-theme]` override cascade
Default tokens are light. `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { … } }` applies dark when the OS wants it unless the user forced light. `:root[data-theme="dark"]` forces dark. The user's explicit choice wins; no choice follows the OS.

### `is:inline` script vs bundled `<script>`
The theme init in `Layout.astro` is `is:inline`, so it runs synchronously in `<head>` before first paint. A bundled `<script>` (like the one in `ThemeToggle.astro`) is deferred as a module, which would let the wrong palette flash first.

### Pure function / DOM wrapper split
`resolveTheme` in `src/lib/theme.ts` is a pure function (stored value + system preference in, theme out), so Vitest can test it without a browser. `ThemeToggle.astro` is the thin DOM wrapper around it.

### `aria-current` / `aria-pressed`
`aria-current="page"` tells assistive tech which nav link is the current page; we also style it with `a[aria-current="page"]`. `aria-pressed` on the toggle announces its on/off state.

### Why `clip-path` breaks focus outlines
`clip-path` clips everything outside the shape, including the outline. So nav links in `Nav.astro` show focus with a fill and underline instead of an outline.

## Why it's done this way
Tokens plus a `data-theme` attribute keep theming in CSS, with a few lines of JS only for persistence. No framework is needed (ADR 0001). The persona-style diagonal accents are limited to chrome (nav, titles) so body text stays readable.

## Try it yourself
Add a third "system" option to the toggle that clears the stored choice. Hint: `resolveTheme(null, …)` already handles it; you also need to remove `data-theme` from `<html>` and `localStorage`. Check: after choosing system, flipping the OS theme changes the site.

## Interview angle
I split theme logic into a tested pure function and a thin DOM layer, and used an inline head script to avoid a flash of the wrong theme. Accessibility (`aria-current`, `aria-pressed`, visible focus despite `clip-path`) was designed in, not bolted on.
