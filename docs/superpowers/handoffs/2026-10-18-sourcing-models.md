# Handoff: sourcing and preparing the Host 3D models

**For:** a fresh Claude session. **Owner's experience:** none with Blender, Mixamo or 3D tools. Walk them through each step with exact clicks, one step at a time, and check the result before moving on. Do as much as possible yourself (scripts, the terminal), so the owner only does what needs their eyes, their accounts or their judgement.

## Where things stand (2026-10-18)

The code is finished and pushed to `main`. What's missing is the models themselves.

- The homepage World has five **Hosts**: Minh, Phoenix Wright, Joker, Isabelle and Reshiram. Each shows a translucent mint capsule (**Stand-in**) because every Host has `source: null`.
- Committing a model is all it takes for a Host to load it at runtime. The model must be scaled to the Host's height, play its `idle` clip on a loop, and play its `talk` clip once when clicked.
- Read first:
  - `docs/superpowers/specs/2026-10-18-real-characters-design.md`, the section **"Sourcing and preparing models"**. It has the full rules and a per-Host table. This handoff summarises it and adds beginner guidance.
  - `docs/learning/10-real-characters.md`, the "Adding a model" section.
  - `CONTEXT.md` for the terms Host, Cast Member, Stand-in and Credit.
- The code entry points:
  - `scripts/add-model.ts` (run as `npm run add-model`)
  - `src/lib/models.ts`
  - `src/world/characters/<id>.ts` (one per Host)
  - `src/world/characters/cast.test.ts`
  - `src/world/models.test.ts`

## The pipeline, end to end

1. **Find** a model online, or build Minh in VRoid Studio.
2. **Prepare** it so it's one `.glb` file with a skeleton (rig) and at least an idle animation, plus a talk animation if possible.
3. **Optimise:** `npm run add-model -- <path/to/original.glb> <id> --idle "<clip name>" [--talk "<clip name>"]`
   - Writes `public/models/<id>.glb`.
   - Refuses a model with no rig, a missing clip name (it lists the clip names the file does have), `--talk` equal to `--idle`, or a result over 1.5 MB.
   - Reads glTF/GLB only, not FBX.
4. **Wire up** `src/world/characters/<id>.ts`:
   - `source: { kind: 'gltf', url: '/models/<id>.glb', clips: { idle: '…', talk: '…' } }`
   - `credit: { title, author, licence, url }`, where `url` must be `https://…`
5. **Check:**
   - Run `npm test`. It fails if the model is over budget, unused, missing, or has a credit without a source or a source without a credit.
   - Run `astro dev --background`, open `/#<step>` and look at it. Stop the server with `astro dev stop`.
6. **Commit** the `.glb` and the character file together. Never commit originals; they stay outside the repo, e.g. `~/models/`.

**Beginner shortcut:** clip names don't have to be `idle`/`talk`. `add-model` takes whatever names the file already has. If a downloaded model is already rigged and animated, skip Blender entirely:
1. Convert it to GLB if needed.
2. Find its clip names, either by running `add-model` with `--idle x`, which prints them, or from https://gltf-viewer.donmccurdy.com/.
3. Pass those names.

Always try this path first.

## Hard rules (don't bend these)

- **Licence:** only CC0, CC BY or CC BY-SA.
  - Reject NC (non-commercial), ND (no derivatives), and Fab "Standard/Personal" licences.
  - Record the title, author, licence and page URL *before* downloading.
- **No game rips.** Skip anything described as "ripped", "extracted", "from the game" or "datamined", or that credits the studio as its source. Fan-made originals only.
- **Size:** aim for about 50k triangles or fewer. The optimised file must be ≤ 1.5 MB.
- **Shape:** a single standing character, not a scene or diorama.
- **Rigged:** a model with no skeleton can't animate and `add-model` rejects it. Human-shaped models can be rigged free on Mixamo.

## Per Host (easiest first is a sensible order)

| Host | id | Search terms | Likely path | Gotchas |
|---|---|---|---|---|
| Joker | `joker` | "Joker Persona 5", "P5 Joker", "Ren Amamiya" | Sketchfab/Fab model → Mixamo rig + clips | The long coat may tear through the legs with Mixamo's rig. Check Mixamo's preview. |
| Phoenix Wright | `phoenix` | "Phoenix Wright", "Ace Attorney", "Naruhodo" | Mixamo | Mixamo's "Pointing" clip makes a good `talk` ("Objection!"). |
| Isabelle | `isabelle` | "Isabelle Animal Crossing", "Shizue" | Prefer already-animated models (Sketchfab **Animated** filter); else try Mixamo | Big head and short limbs, so Mixamo may fail. If nothing works she stays a Stand-in, which is acceptable. |
| Reshiram | `reshiram` | "Reshiram" + **Animated** filter | Must come with its own animations | A dragon, so Mixamo can't rig it. If no animated, licensed model exists, it stays a Stand-in. |
| Minh | `minh` | none: build in **VRoid Studio** (free) | VRoid → VRM → Blender (VRM add-on) → Mixamo → GLB | Export the VRM with "reduce polygons" and texture atlas 1024. See the open decision below about its credit. |

Where to search:
- **Sketchfab** (sketchfab.com): filter Downloadable + licence; Animated/Rigged where offered. Download "Autoconverted format (glTF)" when available.
- **Fab** (fab.com, Epic account): Free + Creative Commons.
- **Mixamo** (mixamo.com, free Adobe account): auto-rigs human-shaped models and supplies idle and wave clips.

The platforms were changing as of Oct 2026: Sketchfab was sold to KitBash, and Epic is moving content to Fab. Check both sites.

## The Mixamo route, for a beginner

The fiddly part is merging two Mixamo downloads (idle and talk) into one GLB. The spec's manual Blender recipe is:
1. Import the idle FBX with its skin.
2. Import the talk FBX without its skin.
3. Move the talk action onto the first armature and delete the second armature.
4. Rename the actions.
5. Push both actions to NLA tracks.
6. Export glTF Binary with Selected Objects and Actions mode.

That's a lot of unfamiliar UI for a novice. Reduce it:

- **Script Blender instead of clicking.** Blender runs headless with `blender --background --python script.py`. Write a small Python script, kept outside the repo or in the scratchpad, that:
  - imports the two FBX files
  - moves the talk action onto the first armature and deletes the other
  - names the actions
  - exports the GLB

  The owner only has to install Blender (4.2 LTS or newer). This is untested here. Verify the bpy calls against the installed Blender version and inspect the output in the glTF viewer before trusting it.
- **Fallback: idle only.** `--talk` is optional. A Host with only an idle clip does the click-hop instead of a talk animation. One Mixamo download "With Skin" still needs converting from FBX to GLB, so Blender (or the headless script, or a converter such as FBX2glTF) is still needed, but no action-merging.
- In Mixamo:
  - pick idles like "Breathing Idle" or "Happy Idle", downloaded as FBX, With Skin, 30 fps
  - pick a talk such as "Waving", "Standing Greeting" or "Pointing", downloaded as FBX, Without Skin, In Place
  - for auto-rigging, the owner places the chin, wrist, elbow, knee and groin markers. Give them a screenshot-level description of where each goes.

## Verifying a model before wiring it up

1. Drop the `.glb` on https://gltf-viewer.donmccurdy.com/. Check that the textures show and each clip plays.
2. Run `add-model`. Note the size it prints.
3. Wire up the character file, run `npm test`, then open the page.
   - Check the Host is the right height, has its feet on the ground, faces the camera, loops idle, and plays talk on click.
   - Click several times quickly. It must never flash a T-pose.

## Open items carried over

- **Minh's credit.** The spec says the credit is title "Minh avatar", author "Minh Le", licence "All rights reserved", with no URL. But `cast.test.ts` requires `credit.url` to match `^https://`, and `index.astro` always renders the title as a link. Ask the owner which they want:
  - (a) link to their GitHub profile or the repo
  - (b) make `Credit.url` optional and render plain text when it's absent. This is a small code change with a test.
- **Visual checks never done in a real browser.** The original implementation couldn't do them, so do them with the first real model:
  - the five capsules' placement and the camera framings
  - click → bubble and hop, and the theme toggle changing the capsule glow
  - the model fit, idle loop, talk on click and rapid clicks
  - with macOS Reduce Motion on: the model stands still and a click shows only the bubble
  - DevTools "Slow 3G", navigating away mid-download: no console errors
  - a wrong clip name logs `[world] model failed …` and the Stand-in remains
- If a good model is slightly over 1.5 MB, the fix is reducing it in Blender with a Decimate modifier, which a headless script can also do. Never raise the budget without the owner's say-so.

## Project conventions

- Use `astro dev --background`, with `astro dev stop` / `status` / `logs`.
- Run `npm test`, `npx astro check` and `npx astro build` before each commit that touches code. Use conventional commits.
- Code style is tabs, with single quotes in `.ts` and double quotes in `.astro`.
- `src/world/characters/*` must never import `three`.
- Issues live on GitHub `mlhv/mlhv.github.io` (`gh` CLI).
- Owner preferences are in memory (`homepage-direction-feedback.md`): no voxel art; they like staged glass cards and mint text.
