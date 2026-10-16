# Voxel World homepage — design

Adds a full-screen, scroll-driven 3D voxel town behind the homepage content, populated with the owner and fan-art video game characters. Builds on the Pallet Town reskin and ClientRouter page transitions (commits `c951baf`, `d5960b8`).

## Intent

- **Outcome:** the homepage feels cute and game-like, Animal Crossing–style, without slowing a recruiter down. Content stays first: every word on the homepage is still plain HTML, readable before any 3D loads.
- **What the owner said:** characters fill the entire screen behind the text, in an Animal Crossing–type world; real characters (Joker, Phoenix Wright, Pokémon, Isabelle), not original look-alikes; voxel style now, possibly more detailed pixel-style models later.
- **Success:** the World loads on `/` without delaying content; scrolling pans the camera across the town; clicking a character shows a speech bubble; light/dark mode maps to day/night; nothing breaks without WebGL, without JavaScript, or with reduced motion.

## Decisions

| Question | Decision |
|---|---|
| Role of the 3D | Living background. Content stays on top and readable. |
| Characters | Real characters as fan art, with a visible credit line. |
| Art style | Voxel, built in code. All characters share one style. |
| Placement | Full-viewport fixed canvas behind the entire homepage (nav, intro, Windows). |
| Scroll behaviour | Camera travels along a path through the town as the page scrolls. |
| Interaction | Click/tap a character → it hops and shows a speech bubble. |
| Build approach | Characters authored as text layer grids in TypeScript, behind a `loadCharacter(source)` seam that a `.vox` loader can join later. |

## Cast (7)

| Cast Member | Spot in town | Idle | Notes |
|---|---|---|---|
| Minh (owner) | Centre, near the start of the camera path | Types on laptop, sips matcha | Black two-block haircut, light warm skin tone, glasses, silver chain + ring, tee + sweatpants; laptop and iced matcha nearby |
| Joker (Persona 5) | Café (Leblanc nod) | Leans, adjusts gloves | Black coat, red gloves, white mask |
| Phoenix Wright (Ace Attorney) | Small courthouse | Desk slam / point | Blue suit, spiky hair |
| Isabelle (Animal Crossing) | Town hall | Waves, bobs | Yellow ears/hair tuft, green vest |
| Gengar | Wandering, near shadows | Floats, grins | Glows at night |
| Oshawott | Grass / pond edge | Hops, wanders | Scalchop on belly |
| Reshiram | Cliff at the far end of the path | Slow wingbeat | Largest model; end-of-scroll reveal |

Each model is about 16 voxels tall (Reshiram larger). Speech lines are short, in character, and stored in each character's file. The owner's line introduces Minh and mentions the Summer 2027 internship search.

## Architecture

### Page structure

- `src/components/World.astro`: a fixed, full-viewport `<canvas aria-hidden="true">` at `z-index: -1`, plus a CSS gradient fallback (day: sky → grass; night: deep blue → dark green) behind the canvas. It is used only on `src/pages/index.astro`.
- Homepage changes: the intro (`h1.page-title` + tagline) moves onto a white card styled like a Window body. The homepage `.desktop` drops its desk colour and dotted wallpaper so the World shows between Windows. The Windows keep their solid surfaces.
- A fan-art credit, "Characters © Nintendo / Game Freak / The Pokémon Company / Atlus / Capcom. Fan art.", sits in small text at the bottom of the homepage.
- Other pages are unchanged.

### Modules

| Unit | Responsibility | Uses three.js | Tested |
|---|---|---|---|
| `src/lib/voxel/model.ts` | `VoxelModel` type `{ palette: Record<string, string>; layers: string[][] }` (layers bottom-up, each a list of row strings; `.` = empty). `parseVoxelModel(model) → Voxel[]` (`{x, y, z, color}`), throwing on unknown palette keys | no | unit |
| `src/lib/voxel/mesh.ts` | `buildVoxelMesh(voxels) → Mesh`: one merged `BufferGeometry` with vertex colours; faces shared between filled neighbours are skipped | yes | browser |
| `src/world/characters/<name>.ts` | One file per Cast Member: `{ id, name, source, position, facing, idle, lines }` | no (data) | unit (validity) |
| `src/world/load-character.ts` | **Upgrade seam.** `loadCharacter(source: CharacterSource): Promise<Object3D>`. `CharacterSource` today is `{ kind: "voxels"; model: VoxelModel }`; a future `{ kind: "vox"; url: string }` branch adds MagicaVoxel files without touching callers | yes | browser |
| `src/world/town.ts` | Island terrain, path, pond, café, courthouse, town hall, cliff, trees, built from voxel models and merged per object | yes | browser |
| `src/world/camera-path.ts` | `cameraAt(progress: number) → { position, target }` along a Catmull-Rom path; `progress` is clamped to [0, 1]. Pure maths on plain `{x,y,z}` tuples | no | unit |
| `src/world/idle.ts` | Idle animation functions by kind (`bob`, `float`, `wander`, `wingbeat`, …), each `(object, t) → void` | yes | browser |
| `src/world/speech.ts` | Raycast pointer → Cast Member; hop tween; position an HTML bubble at the projected head point; `pickLine(lines, previous)` avoids repeats | partly | unit (`pickLine`) + browser |
| `src/world/theme.ts` | Reads the resolved theme (reusing `resolveTheme` from `src/lib/theme.ts`) and maps it to a day/night lighting + sky preset | partly | browser |
| `src/world/main.ts` | `startWorld(canvas) → stop()`: renderer, scene, render loop, wires scroll, resize, theme, pointer, visibility | yes | browser |

### Data flow

- **Scroll:** `scrollY / (scrollHeight − innerHeight)` → `cameraAt(progress)` → the camera eases toward the target each frame.
- **Theme:** the toggle sets `data-theme`, and the OS setting changes `prefers-color-scheme`. A `MutationObserver` on `<html data-theme>` plus the media-query listener → day/night preset (sky colour, light colours, lit windows, Gengar glow, stars).
- **Click/tap:** `pointerdown` on the canvas → raycast against Cast Member bounding boxes → hop + bubble. Windows sit above the canvas, so clicks on them never reach the World.
- **Esc** or clicking elsewhere closes the bubble.

### Lifecycle under ClientRouter

- `astro:page-load`: if `canvas[data-world]` exists and WebGL is available → `const { startWorld } = await import("../world/main")` inside `requestIdleCallback` (falling back to `setTimeout`) → `stop = startWorld(canvas)`.
- `astro:before-swap`: `stop?.()` disposes geometries, materials and the renderer, calls `renderer.forceContextLoss()`, and removes listeners.
- three.js is reached only through that dynamic import, so it is fetched only on `/`.

## Performance, fallbacks, accessibility

- **Load:** the HTML content paints first; the World chunk (three.js ≈ 150 KB gzipped + models as code) loads at idle and fades in over the gradient.
- **Draw calls:** one merged mesh per character and per town object, about 15–25 total. No real-time shadows; each character gets a blob shadow (a soft dark circle).
- **Pixel ratio:** `min(devicePixelRatio, 2)`, or 1.5 on coarse-pointer devices.
- **Loop:** paused while `document.hidden`. When nothing moves and no scroll happens, the loop drops to a low frame rate.
- **Phones:** same World with a shorter camera path. Tap works the same as click.

| Condition | Behaviour |
|---|---|
| No WebGL / context creation fails | Gradient fallback only; page fully works |
| `prefers-reduced-motion: reduce` | One static render: no camera travel, idle animation or hop. Bubbles still open on click |
| JavaScript disabled | Gradient fallback; content unaffected |
| Dynamic import fails | Gradient stays; error caught and logged once |

- **Accessibility:** the canvas is `aria-hidden`, and nothing essential lives only in the World. Bubbles are real DOM text meeting WCAG AA contrast, closable with Esc. Focus order and keyboard navigation of the content are unchanged.

## Testing

- **Unit (Vitest):**
  - `parseVoxelModel`: palette mapping, `.` as empty, unknown key throws, uneven rows/layers, coordinates bottom-up.
  - `cameraAt`: endpoints at 0 and 1, clamping below 0 and above 1, continuity (small progress step → small position change).
  - `pickLine`: never repeats the previous line when there is more than one.
  - Cast validity: every character file parses, has at least one line, and has a unique id.
- **Browser (headless Playwright, scratch script, as used for the transitions work):**
  - The World starts on `/` and stops on navigation away; 10 round trips leave no growing WebGL context count.
  - Scrolling changes the camera; toggling the theme swaps day/night.
  - Clicking a character shows a bubble; clicking a Window still navigates.
  - Reduced motion renders a single static frame; blocking WebGL shows the gradient.
  - Screenshots in day, night and phone width.
- **Perf:** sample frame times in headless Chrome; confirm the three.js chunk is requested only on `/`.
- **Existing gates:** `npm test`, `astro check` and `astro build` stay green.

## Milestones

1. **Foundation:** `three` dependency; ADR 0004; `World.astro` with gradient fallback and start/stop lifecycle; `lib/voxel/model.ts` + `mesh.ts`; `load-character.ts` seam; voxel Minh on a plain island; intro card and homepage desk changes.
2. **Town + camera:** `town.ts` terrain and landmarks; `camera-path.ts` with scroll wiring; day/night presets.
3. **Cast:** Joker, Phoenix Wright, Isabelle, Gengar, Oshawott, then Reshiram on the cliff; idle animations.
4. **Speech bubbles:** raycast, hop, bubble, Esc/outside-click close; fan-art credit.
5. **Polish:** phone tuning, reduced motion, perf pass, `docs/learning/08-voxel-world.md`.

Each milestone ends in a working, shippable homepage.

## Docs

- **ADR 0004 (three.js for the homepage World):** three.js is a rendering library, not a UI framework. It holds no component state and does no hydration, so ADR 0001 still applies. It is loaded only on `/` via dynamic import.
- **`CONTEXT.md`:** add **World** (the 3D voxel town behind the homepage), **Cast Member** (a character in the World), **Voxel Model** (a character or object defined as palette + layer grids). Update **Desktop**: the Windows now float over the World rather than a dotted wallpaper.

## Out of scope / future work

- Characters that link to content (for example a Pokémon → Pkmn-Quant, Minh → résumé).
- Characters reacting to the cursor (look-at, wave, scatter on fast scroll).
- `.vox` / MagicaVoxel models via the `CharacterSource` seam; higher-detail pixel-style models.
- Player-controlled movement or a "play mode".
