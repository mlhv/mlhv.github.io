# 08 — Voxel World

## What we built

- A full-screen three.js World behind the homepage: a voxel island with a café, courthouse, town hall, trees, a pond and a cliff, populated by seven Cast Members (Minh, Joker, Phoenix Wright, Isabelle, Gengar, Oshawott, Reshiram).
- Scrolling moves the camera along a curve from Minh to Reshiram's cliff; light mode is day, dark mode is night (stars, glowing windows, a purple glow on Gengar).
- Clicking a Cast Member makes it hop and shows a speech bubble; Esc or clicking elsewhere closes it.
- Fallbacks: a CSS gradient without WebGL or JavaScript, and a single still frame with `prefers-reduced-motion`.

## Key concepts

### Voxel models as text
Each model is a palette plus layer grids (`layers[y][z][x]`), or boxes painted into that grid with `modelFromBoxes`. Keeping models as data means they are diffable, tested (every Cast Member must parse and stand on land), and independent of three.js.

### Face culling and merged geometry
A voxel face is drawn only if no voxel sits next to it (`visibleFaces`). All visible faces of a model go into one `BufferGeometry` with per-vertex colours, so each character is a single draw call instead of hundreds of cubes.

### Pure core, thin three.js shell
Terrain, camera path, idle poses and line picking are plain functions with Vitest tests. The three.js files only turn their results into meshes and positions. Most bugs show up in unit tests rather than in a browser.

### Catmull-Rom camera path
`cameraAt(progress)` interpolates through a handful of key camera positions with a Catmull-Rom spline, which passes through every key and has no corners. Scroll progress is eased toward each frame so the camera glides instead of snapping.

### Lifecycle under ClientRouter
With client-side navigation, a page's scripts don't rerun on each visit. `World.astro` starts the World on `astro:page-load` (only if the canvas exists) and stops it on `astro:before-swap`. Stopping disposes every geometry and material and forces the WebGL context to be released. three.js is behind a dynamic `import()`, so other pages never download it.

### The upgrade seam
`loadCharacter(source)` is the only place that turns a `CharacterSource` into a 3D object. Adding MagicaVoxel `.vox` files later means adding one union member and one `case`; the scene code doesn't change.
