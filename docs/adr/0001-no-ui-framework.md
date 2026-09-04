# No UI framework — pure Astro + vanilla TypeScript

Interactivity (theme toggle, homepage window clicks, any future filtering) is implemented with plain Astro components and vanilla TypeScript, not a React/Preact/Svelte island. This is a deliberate learning choice — the site's content is not app-like enough to need component state/hydration, and avoiding a framework keeps the focus on Astro and TypeScript fundamentals rather than SPA patterns. Revisit only if a feature genuinely needs client-side state management a framework would meaningfully simplify.
