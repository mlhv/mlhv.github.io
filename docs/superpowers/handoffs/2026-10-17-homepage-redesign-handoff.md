# Handoff: homepage redesign (for a new brainstorming session)

**Start the new session with:** "Read `docs/superpowers/handoffs/2026-10-17-homepage-redesign-handoff.md` and brainstorm it." Use `superpowers:brainstorming`. This work is architectural, so it needs the full path: questions, approaches, written spec, then a plan.

## Where things stand (2026-10-17)

The voxel World homepage shipped to `main` (`28c2f95`) and deploys to GitHub Pages:

- Spec: `docs/superpowers/specs/2026-10-16-voxel-world-home-design.md`
- Plan: `docs/superpowers/plans/2026-10-16-voxel-world-home.md`
- Explainer: `docs/learning/08-voxel-world.md`
- ADR: `docs/adr/0004-threejs-homepage-world.md` (three.js is allowed as a rendering library; ADR 0001 still forbids UI frameworks)
- Terms: `CONTEXT.md` (World, Cast Member, Voxel Model, Desktop, Window)

What exists today:

- `src/components/World.astro`: a fixed full-screen canvas behind the homepage, a CSS gradient fallback, and the start/stop lifecycle under ClientRouter. three.js is loaded through a dynamic import, on `/` only.
- `src/world/`:
  - pure, tested modules: terrain, `camera-path` (scroll → Catmull-Rom camera), `idle` poses, `speech` (`pickLine`/`hopHeight`)
  - three.js modules: `main.ts` (render loop), `town.ts`, `load-character.ts`
- `src/world/characters/*.ts`: seven Cast Members (Minh, Joker, Phoenix Wright, Isabelle, Gengar, Oshawott, Reshiram), each a code-authored voxel model plus its position, idle, and lines.
- **Upgrade seam:** `loadCharacter(source: CharacterSource): Promise<Object3D>` in `src/world/load-character.ts`. `CharacterSource` is currently only `{ kind: 'voxels' }`. A file-based kind (e.g. `{ kind: 'gltf'; url }`) can be added without touching the scene code.
- `src/pages/index.astro`:
  - an intro card and a 12-column `.desktop` grid of four `Window` links (Projects, Work Experience, Blog, Contact), all visible together
  - a scroll "runway" that gives the camera room to travel
  - the fan-art credit line

## What the owner said after looking at the live site

1. **Voxel art is out.** "I want it to be as close to the real characters as possible, even if this might mean having to build/find 3D models in Blender or elsewhere."
2. **The content boxes are bland.** "The content being white against the box for projects, work experience, etc... is so bland."
3. **Reveal one section at a time.** "Scrolling down (or left to right) should reveal each section incrementally, like a picture of me first, then my work experience and then projects. It should never all be present to look at all at once."

## Suggested decomposition (not yet agreed)

These are two sub-projects. Each needs its own spec → plan → implementation cycle.

- **B. Staged homepage (suggested first).** Replace the all-at-once Desktop grid with a scroll sequence that shows one section at a time:
  1. a photo of Minh
  2. work experience
  3. projects
  4. possibly blog and contact

  B decides what the 3D scene does at each step (camera beats, which character appears with which section), so it shapes A.
- **A. Real-looking characters.** Swap the voxel models for proper 3D models, probably glTF/GLB, through the `loadCharacter` seam.

## Open questions for the brainstorm

**B (staged homepage):**
- Scroll direction: vertical, horizontal (scroll-jacked), or vertical scroll driving horizontal movement?
- The steps, their order, and what each one shows. Is there a real photo of Minh, and where does it live?
- Does the 3D World stay as the background, or does each section get its own scene beat or character?
- What replaces the white Windows visually (themed panels, in-world signs, full-bleed sections)?
- Do the Window/Desktop metaphor and those `CONTEXT.md` terms survive?
- Accessibility and fallbacks:
  - Keyboard and screen-reader users must reach all content in order.
  - With `prefers-reduced-motion`, show the steps without scroll-driven animation.
  - Without JavaScript or WebGL, the content must still be fully readable.
  - "Never all at once" must not hide content from crawlers or recruiters skimming. It must still be in the HTML.
- How a recruiter jumps straight to Projects or Work (nav links, deep links, skip control).

**A (real characters):**
- Where the models come from: commissioned, self-made in Blender, or community models with a reuse licence. Models ripped from the games are copyrighted, and the site is public on GitHub Pages; the current credit line covers fan art only.
- Style target: game-accurate, or stylised but recognisable? One consistent style across all seven?
- Poly and texture budget, file size, and loading (lazy per character, Draco or meshopt compression, a placeholder while loading).
- Animation: rigged idle clips (glTF animations through `AnimationMixer`) or the current procedural idles.
- Which characters to keep. Minh's real likeness: a photo-based model or a stylised avatar?
- Is three.js still the right tool (keep it, under ADR 0004)?

## Constraints to carry forward

- No UI framework (ADR 0001). three.js only via the dynamic import on `/` (ADR 0004).
- WCAG AA contrast. Canvas `aria-hidden`. Nothing essential lives only in 3D.
- Reduced motion → no camera travel or idle animation.
- No WebGL, a failed import, or no JS → page still fully works.
- Gates: `npm test`, `npx astro check` (0 errors), `npx astro build`.
- Code style: tabs, single quotes in `.ts`, double quotes in `.astro`; conventional commits.

## Known follow-ups from the voxel World build (still open)

- iPhone Safari tap-to-talk is untested on a real device. The click listener is on `<main>` with a `document` fallback.
- The render loop runs at full frame rate forever; there is no idle throttling.
- The spec's per-character idles (Minh typing and sipping, Joker adjusting gloves, Phoenix's desk slam, Reshiram's wingbeat) were simplified to bob, wander, and soar.
- Smaller deferred items:
  - the raycast ignores buildings, so characters can be clicked through walls
  - a failed `startWorld` after renderer creation leaks the WebGL context
  - `resize` uses `innerWidth` rather than `canvas.clientWidth`
- Much of `src/world/` (town, camera keys, characters, speech) may be reworked or replaced by B and A. Decide what to keep before planning.
