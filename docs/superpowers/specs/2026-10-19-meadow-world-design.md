# Meadow World — design

**Date:** 2026-10-19
**Status:** approved in brainstorm, awaiting spec review
**Supersedes:** the voxel town and the camera path from `2026-10-16-voxel-world-home-design.md` and `2026-10-17-staged-homepage-design.md` (the Stage, the glass cards and the fallback stay)
**Deadline:** co-op applications open Fri 2026-10-23; this is the Tue–Wed item of the content-first plan (`docs/superpowers/handoffs/2026-10-19-scope-cut-content-first.md`)

## Intent

The World behind the homepage should look calm, crafted and game-like, and stay out of the way of the content a recruiter reads.

The owner disliked everything about the voxel town (2026-10-19): the blocky look, the flat lighting, the busyness behind the cards, and the camera moving between Steps.

Decisions made in the brainstorm:

| Question | Decision |
|---|---|
| Rendering | Keep three.js (ADR 0004) |
| Camera | One fixed shot. No movement on scroll or Step change |
| Scene | A stylised low-poly meadow |
| Ambient life | Swaying grass, swaying trees, drifting clouds; fireflies and stars at dusk |
| Grass cost | Measured, with quality tiers, so an old laptop gets fewer blades instead of a slow page |
| How it is built | Approach A: procedural, all in code, with no model assets |
| Themes | Light theme is day; dark theme is dusk |
| Hosts | Stay hidden (`showHosts = false`). The meadow keeps an empty clearing for them |

What must not change: the glass Step cards, the mint text, mandatory desktop scroll-snap, the CSS gradient fallback without WebGL or JS, loading the World only after the content has painted, and WCAG AA text contrast in both themes.

## 1. Composition

One fixed camera, low in the grass at about head height on a person, looking slightly up across the meadow toward the horizon. The World ignores scrolling and Step changes.

Layers, back to front:

1. **Sky.** A gradient dome, pale at the horizon and deeper overhead. A soft sun disc low on the left by day; a pale moon in the same place at dusk, with stars.
2. **Mountains.** A ring of faceted peaks along the horizon, two rows deep, fading into the fog so they read as far away.
3. **Hills.** Smooth rolling low-poly hills in the middle distance.
4. **Trees.** Small clumps in the left and right thirds of the screen, so they frame the centred card rather than hide behind it. On a 1440px-wide screen, a 60rem card leaves about 240px on each side. One or two more trees sit far back for depth.
5. **Grass.** Dense in the foreground and along the bottom edge, thinning with distance. The far field is plain green ground, so no blades are spent where nobody would see them.
6. **Clouds.** A handful of low-poly clouds in the upper third.

- **The horizon** sits about 40% up from the bottom of the screen, so the card mostly covers sky and distant hills, the calmest parts of the scene.
- **Portrait screens and phones:** the camera position is unchanged, and the field of view widens with the screen's shape, so the horizon and the side trees stay in the shot.
- **Clearing for the Hosts:** a flat clearing in the left foreground is kept free of trees, so the characters have somewhere to stand when they return. This is a gap in the tree placement only; there is no Host-specific code.

## 2. Modules

New code lives in `src/world/meadow/`. The layout and the tier logic are pure code that never import `three`, so they can be unit tested.

| File | Job | Uses three.js? |
|---|---|---|
| `layout.ts` | The scene as data: a seeded random-number generator; `heightAt(x, z)` for the hills; the camera shot; tree spots (outside the clearing); grass blade density by distance; cloud and firefly bounds. All the composition numbers live here. Also exports the `Vec3` type. | no |
| `quality.ts` | `pickTier(device)` turns device hints into `'low' \| 'medium' \| 'high'`. `nextTier(tier, avgMs)` decides when to drop a tier at runtime (section 3). | no |
| `sky.ts` | The gradient dome shader, the sun or moon disc, and the stars. | yes |
| `ground.ts` | The flat-shaded hills and the mountain ring, built from `heightAt`. | yes |
| `grass.ts` | An instanced blade mesh with a wind vertex shader, sized by tier. | yes |
| `trees.ts` | `createTree(spec): Object3D`, built from primitives (a tapered trunk and faceted canopy blobs). This is the seam for Approach C (see Later). | yes |
| `clouds.ts` | Instanced low-poly clouds that drift. | yes |
| `fireflies.ts` | Instanced glowing points, shown at dusk only. | yes |
| `meadow.ts` | `buildMeadow(tier)` returns `{ group, update(seconds), applyTheme(preset), setTier(tier), dispose() }`. This is the only interface `main.ts` uses. | yes |

Changes to existing code:

- **`src/world/main.ts`**
  - Drops `buildTown`, the camera glide and `goTo`.
  - Places the camera once, from `layout.ts`, and refits the field of view on resize.
  - Builds the meadow at the starting tier. The frame loop calls `meadow.update(t)` and runs the runtime tier check.
  - The dormant Host code stays: actors, speech, model loading and Stand-ins. Hosts stand at `heightAt(x, z)`.
- **`src/components/World.astro`**: drops the `stage:step` listener and the `goTo` calls. `WorldController` becomes `{ stop }`.
- **`src/world/theme.ts`**: the presets get the meadow's fields (section 4) in place of `sea`, `glow` and the Stand-in colours. `documentTheme` and `watchTheme` are unchanged.
- **`src/world/stand-in.ts`**: the Stand-in colour and glow move out of the presets and become a small constant here.
- **`src/world/fit.ts`**: imports `Vec3` from `meadow/layout.ts`.
- **Hosts load in cast order.** `load-order.ts` existed to load the Host for the starting Step first, and without a camera path there is no starting Step to favour.
- **`src/world/characters/*.ts`**: Host positions move into the clearing.
- **`src/world/characters/cast.test.ts`**: drops the "Hosts match the camera framings" test. "Stands on land" becomes "stands in the clearing".

Deleted (git history keeps them): `town.ts`, `buildings.ts`, `terrain.ts`, `camera-path.ts`, `load-order.ts` and their tests, and all of `src/lib/voxel/`, which only the town used.

## 3. Motion and performance

Every moving part is animated in a vertex shader from one `uTime` value, so the CPU does almost nothing per frame.

| Element | Motion | Speed |
|---|---|---|
| Grass | Bends in a slow wind gust that rolls across the field, with a small per-blade flutter on top. How far a blade bends scales with height, so bases stay planted. | One gust about every 7 s |
| Trees | Canopies rock up to about ±2°, out of phase from tree to tree. | About a 5 s sway |
| Clouds | Slide sideways and wrap around off-screen. | About 3 min to cross the sky |
| Fireflies (dusk only) | About 40 specks bob and drift over the grass, pulsing their glow. | Gentle |

### Grass tiers

Grass dominates the cost. Each blade is a tapered strip of 5 triangles, and all blades are drawn in one draw call. The whole scene is about 10 draw calls.

| Tier | Blades | Pixel ratio cap | Frame cap |
|---|---|---|---|
| high | 60,000 | 2 | 60 fps |
| medium | 25,000 | 1.5 | 60 fps |
| low | 8,000 | 1 | 30 fps |

These counts are starting points. The owner's check on an old laptop sets the final numbers.

- **Starting tier (`pickTier`):**
  - A coarse pointer (phones and tablets) starts at medium.
  - `hardwareConcurrency ≤ 4` or `deviceMemory ≤ 4` starts at low.
  - Anything else starts at high.
  - Missing hints never raise the tier.
- **Runtime check (`nextTier`):**
  - Skips the first 30 frames, then averages the frame time over about 3 s.
  - Above 22 ms (slower than about 45 fps), it drops one tier and measures again. It stops at low.
  - It never raises the tier during a visit.
- **Lowering a tier is cheap.** Blades are stored in a seeded shuffled order, so lowering the grass mesh's `count` thins the field evenly with nothing rebuilt. `setTier` also lowers the renderer's pixel ratio and applies the frame cap.
- **Dev override:** `?world=low|medium|high` forces a tier and turns off the runtime check. It works in `astro dev` only.
- **Frame-time logging:** once a measurement is taken, the console logs `[world] tier=… avg=…ms`, in `astro dev` only.

### Reduced motion

One still render at `t = 0`, re-rendered only on resize or theme change. The frame loop and the runtime check never start.

### Unchanged

- Rendering pauses while the tab is hidden.
- The World is imported at idle, after the content has painted.
- The canvas fades in once the first frame is drawn.

## 4. Theme, contrast and fallback

### Palettes

The colours are presets in `theme.ts`, so they can be tuned in one place. Fields: sky top, sky horizon, sun/moon colour, hemisphere light (sky and ground), key-light colour and intensity, grass (near and far), hills, mountains, fog colour and range, `stars` and `fireflies` (on/off).

| | Light theme: day | Dark theme: dusk |
|---|---|---|
| Sky | Clear blue overhead, fading to a pale haze at the horizon | Deep indigo overhead, through violet, to a warm peach glow at the horizon |
| Sun / moon | Soft warm sun, low on the left | Pale moon, low on the left; about 300 stars above the haze |
| Light | Bright, warm, low-contrast shading, so the facets look soft | Dim, cool blue fill with a warm rim from the horizon |
| Grass and hills | Fresh greens, lighter with distance | Deep blue-greens |
| Mountains and fog | Blue-grey peaks dissolving into the haze | Violet silhouettes dissolving into the glow |
| Fireflies | Off | On |

- **Dusk, not night:** the warm horizon keeps dark mode from being a flat black screen, and the fireflies still show against it.
- **Theme switches are instant**, matching the page's CSS. There is no tween.

### Contrast

- All homepage text sits on the dark glass cards, and `src/styles/glass-contrast.test.ts` already checks every glass text colour against the glass over pure white, the worst case for any background. That guarantee holds whatever the meadow looks like.
- The header and the rail sit on solid surfaces. The speech bubble and the credit line exist only with the Hosts.
- No new contrast tests are needed. The screenshot check (section 5) looks for problems no test measures, such as a bright sun glaring right behind a card's edge.

### Fallback

- Without WebGL or JS, the CSS gradient in `World.astro` still shows.
- Its `--color-world-sky` and `--color-world-ground` tokens in `theme.css` change to the meadow's horizon and near-grass colours, in both themes. The fade from fallback to scene then has no colour jump.
- The 12% background wash over the World stays.

## 5. Testing and docs

### Unit tests (vitest, no three.js)

- **`meadow/layout.test.ts`**
  - `heightAt` returns the same value every time, is finite, and stays within the hill bounds.
  - The camera is above the ground.
  - No tree is inside the clearing.
  - Projected through the camera with pinhole maths at 16:9, every foreground tree lands in the left or right third of the screen.
  - Grass density gets lower with distance.
  - The first 8,000 blades in the shuffled order cover all four quadrants of the grass area.
- **`meadow/quality.test.ts`**
  - A table of device hints and the starting tier each one gives.
  - `nextTier`: no change at or below 22 ms, one tier lower above it, and it stays at low.
- **`src/world/theme.test.ts`** (new; `src/lib/theme.test.ts` covers the theme toggle logic and is unchanged)
  - Every preset colour is a 6-digit hex.
  - The fallback tokens in `theme.css` match each preset's horizon and near-grass colours.
- **`characters/cast.test.ts`**: every Host stands in the clearing.

### Before each commit

`npm test`, `npx astro check` and `npx astro build`.

### Visual and performance check

This uses headless Chrome against `astro preview`, scripted in the scratchpad rather than added to the repo.

- Screenshots of day and dusk, at 1440×900 and 390×844.
- The reduced-motion still frame.
- The `[world]` frame-time line for each forced `?world=` tier, run against `astro dev`, since the override is dev-only.
- The size of the World's gzipped JS chunk, before and after. It is flagged if it grows by more than 20 KB, since deleting the voxel code should roughly pay for the new code.

**Owner's check:** open the dev URL with each `?world=` tier on the oldest laptop available. This sets the final blade counts.

### Docs

- **ADR 0004** gets an update section covering:
  - the fixed camera and why the camera path went
  - the procedural meadow replacing the voxel town
  - the grass tiers
  - the Later notes below
- **`CONTEXT.md`**
  - **World** is redefined as the fixed-camera meadow that switches between day and dusk with the theme.
  - **Host** drops "the Cast Member the camera frames" and keeps the pairing of a Cast Member with a Step, parked behind `showHosts`.
  - The **Voxel Model** entry is removed.
  - The style paragraph's "dark mode is a forest-night version" becomes "dusk".

## Later (not in this spec)

- **Approach C, CC0 props:** trees, rocks and flowers from a CC0 stylised nature pack (e.g. Quaternius or Kenney), optimised with `npm run add-model`. These replace or join the procedural trees through `createTree(spec)` without touching the rest of the scene.
- **Approach B, a Blender-built meadow:** the whole scene modelled in Blender (5.2 LTS is installed) and exported as one GLB, keeping the shader sway on top. It gives the most art control. It is the slowest to build and adds megabytes to the first load, so it would need a new budget instead of the 1.5 MB model budget.
- **Hosts:** bringing them back means `showHosts = true`. Place them in the clearing and reconsider the speech bubble's framing for a fixed camera. Sourcing and rigging are in the 2026-10-19 handoff.

## Out of scope

- Any camera movement, including parallax on scroll.
- Changes to the Stage, the cards, the inner pages or the content.
- Weather, seasons, a day/night cycle on a clock, sound.
