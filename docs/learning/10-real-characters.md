# 10 — Real characters

## What we built

- The five Hosts (Minh, Phoenix Wright, Joker, Isabelle, Reshiram) are now rigged glTF models, or translucent Stand-in capsules until a model exists. The voxel characters, Gengar and Oshawott are gone. The town is still voxel until it gets its own redesign.
- Models load one at a time after the first frame, starting with the Host of the Step you landed on. Each plays an idle loop, and a "talk" clip when clicked.
- `npm run add-model` turns a downloaded model into an optimised `public/models/<id>.glb` of at most 1.5 MB, and refuses models that aren't rigged or are missing a clip.
- The Contact Step's credit line lists every model's title, author and licence.

## Key concepts

### Slots
Each Host has a fixed `Group`, its slot, which the render loop moves and rotates. What's inside the slot can change from a Stand-in to a model without the camera, speech bubbles or shadows noticing, because they all point at the slot.

### Fitting a model you didn't make
Community models arrive at any scale. The Khronos Fox is about 100 units tall, and Mixamo exports are often 0.017. Their origins aren't always at the feet. `fitToHeight` takes the model's bounding box and returns a scale and an offset that make it exactly the Host's `height`, with its feet on the ground and centred on its spot. It's pure, so the maths is unit-tested without WebGL.

### Animation mixers and cross-fades
Each model gets an `AnimationMixer`, which the render loop advances by the frame time (capped at 0.1 s so a hidden tab doesn't jump). Talking is `idle.crossFadeTo(talk)` over 0.25 s, then back again when the one-shot talk clip finishes. One trap: three.js disables an action once it has faded to 0, so `fadeTo` re-enables the target first. Otherwise the Host freezes in its bind pose (the T-pose).

### Reduced motion with real animation
With reduced motion the mixers never advance. Each model is set to frame 0 of its idle clip (`mixer.update(0)`) and rendered once when it arrives, so it stands naturally without moving.

### Late arrivals
A model can finish downloading after you've left the page. `stop()` sets a flag, and the load queue disposes anything that arrives afterwards instead of adding it to a dead scene. Disposal now also frees textures and skeletons, which voxel meshes never had.

### Optimise once, commit the result
gltf-transform prunes, deduplicates, converts textures to WebP at most 1024 px, and meshopt-compresses the geometry. The browser decodes it with three's `MeshoptDecoder`. Only the output is committed, and `models.test.ts` fails if a `.glb` is over budget or no Cast Member uses it.

## Adding a model

Follow "Sourcing and preparing models" in `docs/superpowers/specs/2026-10-18-real-characters-design.md`:

1. Find a licensed (CC0, CC BY or CC BY-SA), non-ripped model.
2. Rig and animate it (Mixamo for human-shaped characters).
3. Name its clips `idle` and `talk` in Blender and export a GLB.
4. Run `npm run add-model -- <file> <id> --idle idle --talk talk`.
5. Set `source` and `credit` in `src/world/characters/<id>.ts`.
6. Run `npm test` and commit.
