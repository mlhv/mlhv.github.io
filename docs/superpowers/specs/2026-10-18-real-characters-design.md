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

See **Sourcing and preparing models** below for the manual steps that come before the script.

## Sourcing and preparing models

This is the owner's manual work, done once per Host after the pipeline ships. The steps are repeated in `docs/learning/10-real-characters.md`. Platform status checked on 2026-10-18:
- Sketchfab still offers free Creative Commons downloads, but Epic is moving content to Fab, and Sketchfab was sold to KitBash in August 2026. Check both sites.
- Mixamo is still free with an Adobe account. It's in maintenance mode and only handles human-shaped characters.

### Where to look

1. **Sketchfab** (sketchfab.com). Search the character's name, then filter by **Downloadable** and by licence. **Animated** and **Rigged** filters, where offered, narrow it to models that already move.
2. **Fab** (fab.com, needs an Epic account). Same searches, filtered to **Free** with a Creative Commons licence.
3. **Mixamo** (mixamo.com) supplies the idle and wave clips for human-shaped Hosts, and can rig a human-shaped model that has no rig.

### Which models are acceptable

- **Licence:** CC0, CC BY or CC BY-SA. Reject the others:
  - **NC** (non-commercial): ambiguous for a job-hunting portfolio.
  - **ND** (no derivatives): optimising the model and adding clips makes a derivative.
  - **Standard / Personal** (Fab): doesn't allow redistributing the file, and the committed `.glb` is public on GitHub.
  - For CC BY-SA, set `credit.licence` to `'CC BY-SA 4.0'` (or the stated version).
- **No game rips.** Skip anything described as "ripped", "extracted", "from the game" or "datamined", or that credits the game studio as the source. Many rips are re-uploaded with a CC licence the uploader had no right to give. Choose original fan-made models. The uploader's licence covers their modelling work only. The characters themselves remain the rights holders' property, which the "Fan art" copyright note covers.
- **Size:** about 50k triangles or fewer (Sketchfab shows the count). Larger models rarely fit 1.5 MB even after compression.
- **Shape:** a single character, standing, ideally in a T-pose or A-pose if it isn't rigged. Not a scene or a diorama.
- **Before downloading:** record the title, author, licence and page URL straight away. These become the `credit`.

Download the **glTF/GLB** format when it's offered (Sketchfab's "Autoconverted format (glTF)"). Otherwise take FBX.

### Common Blender steps (all Hosts)

- Use Blender 4.2 LTS or newer. Import with File → Import → glTF 2.0 or FBX.
- Delete anything that isn't the character: ground planes, lights, cameras, stands.
- Apply the scale so the character is roughly upright and facing −Y in Blender (+Z in three.js, towards the camera). The loader handles size, so exact scale doesn't matter.
- Name the two actions in the Action Editor `idle` and `talk`, and pass those names to `add-model`. Push both to NLA tracks so the exporter includes both.
- Export with File → Export → glTF 2.0:
  - format **glTF Binary (.glb)**
  - Include: **Selected Objects** (the armature and meshes)
  - Animation: **Actions** mode
- Before running the script, drop the `.glb` onto https://gltf-viewer.donmccurdy.com/ and check that both clips play and the textures show.

### Mixamo clips (Minh, Phoenix, Joker; possibly Isabelle)

1. Export the character from Blender as **FBX** with mesh only, no armature. If the model is unrigged, its original FBX also works.
2. Upload it to Mixamo. Place the auto-rigger markers (chin, wrists, elbows, knees, groin) and check the preview. Skip this step if Mixamo recognises an existing compatible rig.
3. Pick an idle, such as "Breathing Idle" or "Happy Idle", and download it as **FBX, With Skin, 30 fps**.
4. Pick a wave ("Waving" or "Standing Greeting") and download it as **FBX, Without Skin**, with **In Place** ticked.
5. In Blender:
   - import the idle FBX
   - import the wave FBX and move its action onto the first armature
   - delete the second armature
   - rename the actions `idle` and `talk`
   - export the GLB as above

Mixamo's rig replaces any original rig, so physics bones such as hair or coat tails go stiff. That's acceptable.

### Per Host

| Host | Where to search | Prep path | Notes |
|---|---|---|---|
| **Minh** | none: build it in **VRoid Studio** (free, Windows/macOS) | VRoid → Mixamo → Blender | Make a stylised avatar from reference photos. Export as VRM with the export options **reduce polygons** and **texture atlas resolution 1024** to keep it small. Import into Blender with the **VRM Add-on for Blender** (extensions.blender.org/add-ons/vrm), then follow the Mixamo steps. Credit: title "Minh avatar", author "Minh Le", licence "All rights reserved" (it's your own work). |
| **Phoenix Wright** | Sketchfab / Fab: "Phoenix Wright", "Ace Attorney", "Naruhodo" | Mixamo | Look for the blue suit and spiky hair, standing. For `talk`, the "Pointing" Mixamo clip suits him ("Objection!") better than a wave. |
| **Joker** | Sketchfab / Fab: "Joker Persona 5", "P5 Joker", "Ren Amamiya" | Mixamo | Prefer the Phantom Thief coat outfit. The long coat may deform oddly with Mixamo's rig. Check the preview, and if the coat tears through the legs, choose another model or a shorter coat. |
| **Isabelle** | Sketchfab / Fab: "Isabelle Animal Crossing", "Shizue" (her Japanese name) | Tick the **Animated** filter first. Otherwise try Mixamo. | She's bipedal but has a huge head and short limbs. Mixamo can sometimes rig her if the markers are placed carefully. Judge the preview. If neither works, she stays a Stand-in. |
| **Reshiram** | Sketchfab / Fab: "Reshiram", with the **Animated** filter | Must ship with clips | A dragon, so Mixamo can't rig her. Choose a model with an idle or flying loop and, ideally, a roar for `talk`. If none exists, she stays a Stand-in. Optional stretch goal: hand-animate a simple wing-flap loop in Blender. |

### After the GLB is ready

```
npm run add-model -- ~/models/joker.glb joker --idle idle --talk talk
```

Then, in `src/world/characters/joker.ts`:
- set `source` (`url: '/models/joker.glb'` and the clip names)
- set `credit`
- run `npm test`
- commit the `.glb` and the edited file together

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
- New `docs/learning/10-real-characters.md`: the pipeline, the sourcing and prep steps above, slots and Stand-ins, mixers, and reduced motion.

## Constraints carried forward

- No UI framework (ADR 0001). three.js and its loaders only through the dynamic import on `/` (ADR 0004).
- The canvas stays `aria-hidden`, and nothing essential exists only in 3D. Credits are HTML.
- Reduced motion means no camera travel, no clip playback and no idle motion.
- With no WebGL, a failed import, or no JS, the page still fully works.
- Code style: tabs, single quotes in `.ts`, double quotes in `.astro`; conventional commits.
