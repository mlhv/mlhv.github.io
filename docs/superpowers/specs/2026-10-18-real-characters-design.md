# Real characters (sub-project A) — design

**Date:** 2026-10-18
**Status:** approved in brainstorm, awaiting spec review
**Builds on:** `2026-10-17-staged-homepage-design.md` (Stage, Steps, Hosts, camera framings)
**Follow-up:** sub-project C, a World environment that matches the characters' style (replaces the voxel town; separate spec)

## Intent

The owner rejected voxel art: "I want it to be as close to the real characters as possible, even if this might mean having to build/find 3D models in Blender or elsewhere." Each Host should be clearly recognisable as its character when the camera frames it, and feel alive, while the page stays light enough that the first card appears fast for a recruiter.

Decisions made in the brainstorm:

| Question | Decision |
|---|---|
| Scope | Characters now; the voxel town is replaced later in sub-project C to match |
| Model source | Community models with a reuse licence (e.g. Sketchfab CC-BY); never models ripped from games |
| Minh | A stylised avatar (e.g. made in VRoid Studio), not a photo scan |
| Animation | Real rigged animation clips played through `AnimationMixer` |
| Cast | The five Hosts first (Minh, Phoenix, Joker, Isabelle, Reshiram); the data model allows any number, so extras can return later |
| Shipping | Incremental: a Host without a model shows a neutral Stand-in; each model lands on its own |
| Failed load | The same Stand-in; the voxel character code is deleted, not kept as a fallback |
| Pipeline | Optimise once with a repo script, commit only the optimised `.glb` |
| Budget | 1.5 MB per optimised model, enforced by a test |

## Non-goals

- Replacing the voxel town, terrain, buildings or props (sub-project C). `src/lib/voxel` stays for the town.
- Gengar and Oshawott. They are removed now and can come back as single cast entries later.
- Lip sync, facial animation, or more than two clips per Host.
- Building build-time model optimisation or loading from a third-party CDN.
- Choosing the specific community models. Sourcing is the owner's manual work after the pipeline ships; the spec only defines what a model must satisfy.

## Data model

`src/world/cast.ts`:

```ts
export type CharacterSource = {
	kind: 'gltf';
	/** Path under public/, e.g. '/models/joker.glb'. */
	url: string;
	/** Animation clip names inside the file. */
	clips: { idle: string; talk?: string };
};

export interface Credit {
	title: string;
	author: string;
	/** e.g. 'CC BY 4.0'. */
	licence: string;
	/** The model's source page. */
	url: string;
}

export interface CastMember {
	id: string;
	name: string;
	/** Base position on the island, world units. */
	position: readonly [x: number, z: number];
	/** Radians around y; 0 faces the camera (+z). */
	facing: number;
	/** World units. The Stand-in is this tall, the loader scales the model to it, and the shadow is sized from it. */
	height: number;
	/** null until a model is committed: the Host shows a Stand-in. */
	source: CharacterSource | null;
	motion: Motion;
	/** Required whenever `source` is set. */
	credit: Credit | null;
	lines: readonly string[];
}
```

- `src/world/characters/` keeps one file per Host: `minh.ts`, `phoenix.ts`, `joker.ts`, `isabelle.ts`, `reshiram.ts`. `index.ts` exports `cast` in Step order.
- All five start with `source: null` and `credit: null`. Adding a model later is one small commit: the `.glb` plus `source` and `credit` in that Host's file.
- Each Host keeps its current `position`, `facing` and `lines`. `height` is set so the Stand-in and the model fill the same space the voxel figure did, so `FRAMINGS` in `camera-path.ts` stay valid.

## Loading

`src/world/load-character.ts`:

```ts
export interface LoadedCharacter {
	object: Object3D;
	clips: { idle: AnimationClip; talk: AnimationClip | null };
}

export const loadCharacter = async (source: CharacterSource, height: number): Promise<LoadedCharacter>;
```

- It loads with three's `GLTFLoader` and `MeshoptDecoder` from `three/examples/jsm`, inside the existing dynamic import on `/`. There is no new runtime dependency.
- It scales and grounds the model with a pure function in `src/world/fit.ts`:

  ```ts
  /** Uniform scale and y offset that make a box `height` tall with its bottom at y = 0. */
  export const fitToHeight = (box: { min: Vec3; max: Vec3 }, height: number): { scale: number; offsetY: number };
  ```

  The model also gets centred on x and z, so its base position is where it stands.
- It looks up `clips.idle` and `clips.talk` by name. If the idle clip is missing, or a named talk clip is missing, it throws, and the load counts as failed.
- It stays the only place that turns a `CharacterSource` into an object.

## Runtime (`src/world/main.ts`)

### Slots and Stand-ins

- Each actor's `object` is a `Group` (the slot). The render loop positions and rotates the slot exactly as it does today. Speech raycasts target the slot.
- At start, every slot holds a Stand-in from `src/world/stand-in.ts`:
  - a `CapsuleGeometry` sized to the member's `height`
  - a translucent material with a little emissive glow, coloured per theme (pale mint by day, a faint glow at night)
  - it reacts to clicks like any Cast Member
- The ground shadow is sized from `height` (capped as today), not measured from the mesh.

### Load queue

- `startWorld` no longer waits for the characters. The town and the Stand-ins render on the first frame.
- After that, a queue loads models one at a time:
  - the Host of `options.initialStep` goes first
  - the rest follow in Step order
  - members with `source: null` are skipped
- When a load succeeds:
  - the Stand-in is removed from the slot and disposed
  - the model is added
  - an `AnimationMixer` starts its idle clip (see Animation)
- When a load fails (404, corrupt file, missing clip):
  - `console.warn('[world] model failed', id, error)`
  - the Stand-in stays, and the queue moves on

### Teardown

- `stopWorld` sets a `stopped` flag.
- A load that finishes after it is disposed straight away and never added to the scene.
- Disposal covers geometries, materials, textures and skeletons of loaded models, plus the mixers.

## Motion and animation

### Body motion

Body motion is computed in code. `src/world/idle.ts` becomes `src/world/motion.ts`:

```ts
export type Motion = { kind: 'still' } | { kind: 'soar' };
export const motionPose = (motion: Motion, t: number, seed: number): Pose;
```

- `still` returns a zero offset: Minh, Phoenix, Joker and Isabelle. Their clips do the moving.
- `soar` keeps today's slow rise and fall: Reshiram.
- `bob`, `float` and `wander` are deleted. `Pose` drops `heading`, since only `wander` used it.

### Clips

- Each loaded model gets one `AnimationMixer`, which the render loop updates with the frame delta.
- The idle action loops forever, starting at a different time per Host (from its seed) so they don't move in step.
- When a speech bubble is picked:
  - if the model has a `talk` clip: play it once, fade from idle over 0.25 s, then fade back to idle over 0.25 s when it ends
  - if there is no `talk` clip, or the slot holds a Stand-in: today's click-hop

### Reduced motion

- Mixers never advance. Each model holds frame 0 of its idle clip, which counts as the standing pose.
- `soar` is evaluated at t = 0, as today.
- Clicking shows the bubble only, with no talk clip and no hop.
- After a model swaps in, the frame is rendered once (there's no running loop).

## Model pipeline

`npm run add-model -- <original.glb> <id> --idle <clip> [--talk <clip>]` runs `node scripts/add-model.ts`. It uses `@gltf-transform/core`, `@gltf-transform/functions` and `@gltf-transform/extensions` (dev dependencies) plus `meshoptimizer` for compression.

1. Read the original. Reject it if it has no skin, or if `--idle` (or `--talk`, when given) doesn't name a clip in the file. On rejection, list the clips the file does have.
2. Remove clips other than the named ones.
3. `prune`, `dedup`.
4. Resize textures to at most 1024 px and convert them to WebP.
5. Compress with meshopt (`EXT_meshopt_compression`).
6. Reject the result if it's over 1.5 MB, and print the size.
7. Write `public/models/<id>.glb`, and print the clip names, size and next steps (set `source` and `credit` in `src/world/characters/<id>.ts`).

The script never edits TypeScript. Originals stay outside the repo (the owner keeps them for re-runs).

Preparing a model before the script (owner, manual, documented in the learning note):

- **Minh:** VRoid Studio avatar → export VRM → import into Blender (VRM add-on) → apply Mixamo idle and wave clips → export GLB.
- **Joker and Phoenix:** a licensed rigged community model → Mixamo idle and wave → Blender → GLB, if the model doesn't already ship with clips.
- **Isabelle and Reshiram:** need a licensed community model that already includes an idle clip (Mixamo only rigs humanoids). If none exists, the Host stays a Stand-in.

## Credits

The fixed credit line on the Contact Step (`src/pages/index.astro`) becomes:

- The copyright note for the original game characters, always shown, unchanged: "Characters © Nintendo / Game Freak / The Pokémon Company / Atlus / Capcom. Fan art."
- Below it, one line per cast member with a `credit`: *Title* by Author, licence, with the title linking to the source page. The lines are produced by a pure `creditLines(cast)` in `src/world/credits.ts`.
- With every Host still a Stand-in, only the copyright note shows.

The credits are static HTML, built at build time from the cast data. They don't depend on WebGL or JavaScript.

## Testing

All tests are Vitest on pure functions, as today:

- `characters/cast.test.ts`:
  - ids are unique
  - every `FRAMINGS` `castId` is in the cast, at its `anchor` position (existing check)
  - every member with a `source` has a `credit`
  - every `source.url` exists under `public/`
  - `height` is positive
- `models.test.ts`: every `.glb` in `public/models/` is at most 1.5 MB, and every file there is referenced by some member's `source`, so nothing is left orphaned.
- `fit.test.ts`: `fitToHeight` works for an off-origin box, a box below the ground, and a flat box.
- `motion.test.ts`: `still` returns a zero pose for any t, and `soar` stays bounded and is deterministic. This replaces `idle.test.ts`.
- `credits.test.ts`: `creditLines` returns no lines when nothing is credited, and returns lines in cast order.
- The existing `speech`, `camera-path`, `terrain` and `buildings` tests keep passing.

Not unit-tested, so checked by hand in the browser:

- a Stand-in appears, then the model swaps in
- the idle loops, and the talk clip plays on click
- the Stand-in stays when a file 404s
- reduced motion holds the pose
- navigating away mid-load leaves no errors

Gates: `npm test`, `npx astro check` (0 errors), `npx astro build`.

## Deleted

- `src/world/characters/gengar.ts`, `oshawott.ts`, `humanoid.ts`, and the voxel grids in the five Host files.
- The `voxels` case in `loadCharacter`, and the voxel imports in `cast.ts`.
- The Gengar point light in `main.ts`.
- `idle.ts` and `idle.test.ts` (replaced by `motion.ts`).

Kept: `src/lib/voxel/*` (the town uses it until sub-project C).

## Docs

- `CONTEXT.md`:
  - **Cast Member:** now the five Hosts with glTF models or Stand-ins
  - **Voxel Model:** narrowed to town props
  - new **Stand-in:** the neutral capsule a Host shows without a model
  - new **Credit:** the attribution a licensed model requires
- New `docs/adr/0005-community-gltf-characters.md`:
  - characters are community glTF models with reuse licences; no ripped game assets
  - only optimised files are committed
  - 1.5 MB per model
  - Stand-ins instead of a voxel fallback
  - this replaces the `.vox` upgrade note in ADR 0004
- New `docs/learning/10-real-characters.md`: the pipeline, the Blender/Mixamo/VRoid prep steps, slots and Stand-ins, mixers, and reduced motion.

## Constraints carried forward

- No UI framework (ADR 0001). three.js and its loaders only through the dynamic import on `/` (ADR 0004).
- The canvas stays `aria-hidden`, and nothing essential exists only in 3D. Credits are HTML.
- Reduced motion means no camera travel, no clip playback and no idle motion.
- With no WebGL, a failed import, or no JS, the page still fully works.
- Code style: tabs, single quotes in `.ts`, double quotes in `.astro`; conventional commits.
