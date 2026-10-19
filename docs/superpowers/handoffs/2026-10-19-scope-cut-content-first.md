# Handoff: scope cut, content first (2026-10-19)

**For:** a fresh Claude session. Start by brainstorming with the owner (use `superpowers:brainstorming`), not by building. The questions below are the agenda.

**Deadline:** co-op applications open **Friday 2026-10-23**. The site must be recruiter-ready by then, and every hour should go to what a recruiter sees in 30 seconds.

## The decision

The 3D characters (Hosts) are **parked**. Getting them right is real work, and the owner's long-term goal is higher than what we can reach this week:

- **Long-term vision (after applications):** extremely stylised characters, close to the games, playing **real animations from the games** rather than Mixamo's generic ones.
- **Now:** make the background (the World) look nice, and focus on the content.

## Where things stand

- **On `main`, committed and pushed:** the staged homepage (Steps, glass cards, the World), the Host loading code, `add-model`, and the five Hosts, all Stand-ins (mint capsules).
- **Committed with this handoff:** `add-model --unlit`, which marks every material `KHR_materials_unlit`. It is tested. Also committed: the 2026-10-18 sourcing handoff.
- **Phoenix is a Stand-in again.** Two attempts were built and dropped, not committed:
  - a Sketchfab model re-rigged on Mixamo
  - a Dual Destinies rip with Mixamo clips, the game's toon outline and unlit materials, at 0.39 MB
- The Dual Destinies build survives outside the repo as `~/models/phoenix-dd/phoenix-animated.glb`. To restore it, run `npm run add-model -- ~/models/phoenix-dd/phoenix-animated.glb phoenix --idle idle --talk talk --unlit`.

## Agenda for the brainstorm

### 1. What do the Hosts do until after applications?
- **(a) Hide all Cast Members** (no capsules, no models). The camera path stays.
  - Cleanest, and nothing looks unfinished.
  - The Credits list under Contact must then be empty or hidden.
- **(b) Keep the mint Stand-ins.** They're already shipped, but a recruiter may read them as placeholders.
- **(c) Keep Phoenix as the only real model** and hide or capsule the rest. This looks inconsistent.
- The rule change on rips (below) only matters if Phoenix stays.
- **My lean:** (a), behind a single flag so the Hosts come back in one line.

### 2. "Make the background look nice": what is wrong with the World today?
- **Ask the owner to name what bothers them.** Memory says the owner rejected voxel *characters*. It's unclear whether the voxel *town* is acceptable.
- Directions to put in front of them, cheapest first:
  - **Polish the existing town:** a sky gradient, fog for depth, softer lighting, a better day/night palette, slower camera moves.
  - **Strip it down:** a calm, minimal low-poly island or abstract landscape behind the glass cards. Less to look at, less to look wrong.
  - **2D:** an illustrated or parallax backdrop that drops three.js on this page. It's a big change and would conflict with ADR 0004.
- Whatever is chosen must keep:
  - the glass cards, the mint text and the mandatory desktop scroll-snap (owner likes these; see memory)
  - text at WCAG AA contrast over the background, in both themes
  - a fast first paint on a recruiter's laptop

### 3. Content: what does a recruiter see, and is it good?
Audit each Step and inner page with the owner:
- **Hello:** does it say who Minh is, what they want (2027 SWE internship / co-op) and where to click, in five seconds? Is there a photo?
- **Work Experience:**
  - It is synced from the master résumé (`npm run sync-resume`, ADR 0003).
  - Is the résumé current, and is `public/resume.pdf` the version being sent out?
- **Projects:**
  - 8 entries in `src/content/projects/`. Which are `featured`, and is that order right?
  - Do they have links (repo/demo), screenshots, and impact numbers up front?
- **Blog:** it's empty ("Posts coming soon" on `/` and `/blog/`). Either hide the Blog Step and nav item until there's a post, or write one short post. An empty section looks worse than none.
- **Contact:** email, GitHub, LinkedIn and the résumé link all work.

### 4. A recruiter-readiness pass (likely the last day)
- Mobile layout and the reduced-motion path.
- Lighthouse performance and accessibility.
- The no-JS fallback.
- Page titles, meta description and a social preview image (`og:image`).
- Favicon, 404 page and dead links.
- The deploy is green on GitHub Pages.

### 5. A rough plan for Mon–Thu, agreed with the owner
For example:
- **Mon:** decisions and hiding the Hosts.
- **Tue–Wed:** content.
- **Wed:** the World.
- **Thu:** the readiness pass, then deploy.

## Parked: what we learned about characters (for later)

**Rule change, decided by the owner on 2026-10-19:**
- Ripped game models are now acceptable.
- This contradicts the spec's "Sourcing and preparing models" rules, ADR 0005 and the 2026-10-18 sourcing handoff, none of which have been updated yet.
- When characters resume, write an ADR superseding the sourcing part of 0005 and update the spec.
- Credit rips honestly, e.g. author "Capcom", licence "© Capcom, ripped via The Models Resource".

**Pipeline knowledge:**
- **Scripts:** Blender 5.2 LTS is installed. The headless scripts are in `~/models/scripts/` (outside the repo):
  - `prep_obj.py`: turns a rip into one clean T-pose mesh for Mixamo, dropping named swap pieces.
  - `to_mixamo.py`: the same for a GLB.
  - `merge.py`: idle + talk FBX → one GLB, restores the original textures, and can re-skin an outline mesh by copying weights.
  - `preview.py` / `fbxinfo.py`: renders and inspects the results.
- **Swap pieces:** game rips carry swappable pieces: 5 right hands, 7 mouths, 5 eye sets, a held prop, sleeve variants. Keep one of each, or Mixamo fails or the face looks doubled. Match outline pieces to body pieces by surface distance, not bounding boxes.
- **Outlines:** toon outline shells (`*_ol_*` / `*_line*`) break Mixamo's auto-rigger. Rig without them, then copy the body's weights onto them in Blender.
- **Materials:** game art wants unlit materials (`add-model --unlit`). OBJ materials import as glossy (roughness 0), which made the first attempt look like plastic.
- **The stray Icosphere:** the "Icosphere" seen after importing a GLB is something Blender's importer adds as a bone display shape, not part of the model.
- **Why Mixamo falls short of the long-term vision:**
  - Its automatic skinning is generic, so shoulders and elbows deform worse than the game's hand-tuned rig.
  - Its animations aren't the characters' own.
- **The better route:** rips that keep the **game skeleton, skin weights and animations**, e.g. rigged `.dae`/`.fbx` exports or Noesis/Switch toolkit dumps, which skip Mixamo entirely. Plus a toon shader with game-style outlines in three.js.
- **Remaining Hosts:**
  - Joker: every downloadable Joker is a rip.
  - Isabelle and Reshiram need their own animated rigs.
  - Minh is still a VRoid build.

## Project conventions (unchanged)
- `astro dev --background` (`astro dev stop|status|logs`).
- `npm test`, `npx astro check` and `npx astro build` before each code commit. Conventional commits.
- Tabs; single quotes in `.ts`, double quotes in `.astro`. `src/world/characters/*` never imports `three`.
- Owner preferences are in memory (`homepage-direction-feedback.md`).
