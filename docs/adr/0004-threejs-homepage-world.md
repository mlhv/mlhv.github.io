# three.js for the homepage World

The homepage World (a 3D voxel town behind the content) is rendered with three.js. This does not conflict with ADR 0001: three.js is a rendering library, not a UI framework. It holds no component state, does no hydration, and renders nothing the page's content depends on. Every word on the homepage is still static HTML from Astro. three.js is loaded only on `/`, through a dynamic import that runs after the content has painted. Without WebGL or JavaScript, the page shows a CSS gradient instead. Characters are authored as text voxel grids in TypeScript behind a `loadCharacter(source)` seam, so a file-based model format (for example MagicaVoxel `.vox`) can be added later without changing the scene code.

**Update (2026-10-18):** Cast Members are no longer voxel grids. They are community glTF models loaded through the same `loadCharacter` seam; see ADR 0005.
