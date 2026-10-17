# Staged homepage (sub-project B) — design

**Date:** 2026-10-17
**Status:** approved in brainstorm, awaiting spec review
**Supersedes:** the Desktop/Window layout from `2026-10-16-voxel-world-home-design.md` (the World itself stays)
**Follow-up:** sub-project A, real-looking character models through the `loadCharacter` seam (separate spec)

## Intent

The homepage should feel like a crafted, game-like walk through who Minh is, not a background behind a static grid. A recruiter must still get the substance (where Minh worked, what Minh built) within seconds.

Owner's requirements (2026-10-17):

- Reveal one section at a time, in order: photo of Minh, then work experience, then projects (then blog, contact). Never everything at once.
- Replace the bland white Windows with something easy to read that still lets the World and its personality show through.
- Must work well on a phone.

Decisions made in the brainstorm:

| Question | Decision |
|---|---|
| Scroll direction | Vertical, full-height sections |
| Hand-off between sections | Free scroll with reveal; gentle proximity snap on desktop only |
| What the World does | A camera beat per section, framing that section's Host |
| Panel style | Dark frosted-glass card, centred, in every section |
| First screen | Centred hero: big headshot, name, tagline, skip chips |
| Content depth | Highlights on the homepage + "See all →" link to the full page |
| Navigation | Progress rail (desktop dots / phone top bar) + skip chips on Hello |
| Camera driver | Section-driven: camera glides to the active step's shot and holds still while reading |

## Domain language changes (`CONTEXT.md`)

Remove **Desktop**. Keep **Window** (still used on the Projects and Resume pages), dropping "on the Desktop" from its definition. Add:

- **Stage** — the homepage as a sequence of Steps revealed one at a time over the World. _Avoid_: slideshow, carousel.
- **Step** — one full-height section of the Stage (Hello, Work, Projects, Blog, Contact), with one glass card. _Avoid_: slide, panel, page.
- **Host** — the Cast Member the camera frames for a Step. _Avoid_: guide, mascot.

Update the **Theme** paragraph: the homepage uses dark frosted-glass cards over the World instead of a retro-desktop metaphor; the sticker/pill accents stay on chrome across the rest of the site.

## Steps

All five Steps are server-rendered `<section>`s in this DOM order. Each is `min-height: 100svh` with its card centred, has an `id`, and an `<h2>` (Hello uses the page `<h1>`).

| # | id | Card contents | Host |
|---|---|---|---|
| 1 | `hello` | Circular headshot (≈200px; `src/assets/headshot.jpeg` through Astro `<Image>`, alt "Minh Le"), name (`<h1>`), tagline, "Looking for Summer 2027 internships", skip chips **Work ↓ · Projects ↓ · Contact ↓** (anchor links) | Minh |
| 2 | `work` | Each `resume.experience` entry: role · company, dates (`endDate` or "Present"), first `highlights` item; link **See all experience →** `/work/` | Phoenix Wright |
| 3 | `projects` | First 3 of `sortProjects(projects)`: `ProjectLogo`, title (links to the project page), `description`, `techStack` chips; link **All projects →** `/projects/` | Joker |
| 4 | `blog` | Latest 2 of `getVisiblePosts()`: title (link), date, description; or "Posts coming soon."; link **All posts →** `/blog/` | Isabelle |
| 5 | `contact` | Email, LinkedIn, GitHub, Résumé (`/resume/`) as buttons; fan-art credit line below the card | Reshiram |

Each card starts with a small kicker: `01 · Hello`, `02 · Work Experience`, and so on.

The headshot source is `~/Documents/headshot.jpeg` (400×400, plain grey backdrop), copied into `src/assets/headshot.jpeg`.

## Visual design

- **Glass card:** dark translucent fill with `backdrop-filter: blur(12px)` and a 1.5px mint border at partial opacity, rounded with `--radius`, light text, and a mint kicker and accent. The same card is used in light and dark themes. The fill alone is opaque enough to keep AA contrast, so browsers without `backdrop-filter` need no fallback.
- **New tokens** in the global stylesheet: `--color-glass`, `--color-on-glass`, `--color-glass-muted`, `--color-glass-accent`, `--color-glass-border`. Every pairing on the glass meets WCAG AA (4.5:1 body, 3:1 large text and UI). Measure against the glass composited over pure white, the worst case.
- **Width:** `min(40rem, 100% - 2rem)`. On phones a card may be taller than the screen and scrolls normally.
- **Hello card:** the photo sits on top, centred, with a mint ring, and the text is centred below.
- **Progress rail:**
  - ≥768px: five dots fixed at the right edge, with labels shown on hover and focus.
  - <768px: a thin fixed progress bar under the nav, filled to `(active + 1) / 5`, with the dots visually hidden but still in the DOM as links.
  - Markup: `<nav aria-label="Sections">` with five `<a href="#id">`.

## Behaviour

### Active step (`src/stage/active-step.ts`, pure)

```ts
export interface StepRect { top: number; bottom: number }
/** Index of the step containing the viewport's vertical middle; otherwise the nearest one. -1 for no steps. */
export const activeStep = (rects: readonly StepRect[], viewportHeight: number): number
```

### Stage controller (`src/components/Stage.astro`, inline module script)

- It runs on `astro:page-load` when the page has `[data-stage]`.
- It measures the sections and computes `activeStep` on `scroll` (rAF-throttled) and `resize`.
- When the active step changes, it:
  - sets `data-active` on the active `<section>` and removes it from the others
  - sets `aria-current="step"` on the matching rail link
  - calls `history.replaceState(history.state, '', '#' + id)`, keeping `history.state` because ClientRouter stores its navigation state there; Hello clears the hash
  - dispatches `new CustomEvent('stage:step', { detail: { index, id } })` on `document`
- On start, it sets `document.documentElement.dataset.stage = ''` and fires the initial step immediately. With a URL hash, the browser has already scrolled to that section.
- It is torn down on `astro:before-swap`.
- `focusin` inside a Step makes that Step active immediately. The browser scrolls a focused element into view, but not necessarily to the middle of the screen, so without this a keyboard user could focus a link in a card that is still faded out.

### Reveal (CSS)

- These rules apply only under `:root[data-stage]`, so without JS every card is visible.
- `section:not([data-active]) .card` has `opacity: 0; transform: translateY(2rem)`, and the active card animates to `opacity: 1; transform: none` over 500ms ease-out.
- Inactive cards are never `hidden`, `inert`, or `aria-hidden`.
- `@media (prefers-reduced-motion: reduce)`: no transition. Inactive cards stay at `opacity: 0.15` with no transform, so the content stays visible.
- `@media (min-width: 768px) and (min-height: 600px) and (prefers-reduced-motion: no-preference)`: `scroll-snap-type: y proximity` on the root and `scroll-snap-align: center` on sections.

### World (`src/world/`)

- **Shots replace the scroll curve.** In `camera-path.ts`:
  - Remove `CAMERA_KEYS`, `cameraAt`, and `scrollProgress`.
  - Add `type StepId = 'hello' | 'work' | 'projects' | 'blog' | 'contact'`.
  - Add `SHOTS: Record<StepId, { landscape: CameraKey; portrait: CameraKey }>`.
  - Add `shotFor(step: StepId, aspect: number): CameraKey`, which uses portrait when `aspect < 1`.
  - Landscape shots put the Host beside the centred card (left or right third). Portrait shots put the Host in the band above the card.
- **Glide** (`camera-path.ts`): `tweenShot(from: CameraKey, to: CameraKey, t: number): CameraKey` interpolates position and target linearly with ease-in-out cubic on `t` (clamped 0–1). `GLIDE_SECONDS = 1.2`.
- **Controller API.** `startWorld(canvas, bubble, { reducedMotion, initialStep })` resolves to `{ stop(): void; goTo(step: StepId): void }`.
  - `goTo` records the current camera key as `from`, the new shot as `to`, and restarts the glide clock.
  - Retargeting mid-glide starts from the live camera position.
  - With reduced motion, the camera cuts straight to the shot and renders one frame.
  - Resize re-picks landscape or portrait for the current step.
- **`World.astro`:**
  - It reads the current step from `location.hash` (defaulting to `hello`) for `initialStep`.
  - It listens for `stage:step` and calls `controller.goTo(detail.id)`.
  - Events that arrive before the World is ready only update the step it will start on.
  - It removes the listener on `astro:before-swap`.
- **Town order.** The camera must travel west to east as Minh → Phoenix → Joker → Isabelle → Reshiram. Swap the café and courthouse positions (with Joker and Phoenix) in `town.ts`, `buildings.ts`, and the two character files so the courthouse sits west of the café. Building tests are updated to match.
- **Unchanged:** idles, wanderers (Gengar, Oshawott), click-to-talk speech, theme switching, and the gradient fallback.

## Fallbacks

| Situation | Behaviour |
|---|---|
| No JS | No `data-stage`. All cards are visible and stacked over the CSS gradient. Anchors and rail links still jump. |
| No WebGL, or the import fails | The Stage still reveals cards and updates the rail and hash. There is no camera. |
| Reduced motion | No card animation. Inactive cards are dimmed, not hidden. The camera cuts. There are no idles and no snap. |
| Deep link `/#projects` | The browser scrolls there, the Stage marks Projects active, and the World starts on Joker's shot. |

## Removed

- The homepage's use of `Window` (the component stays: `/projects/` and `/resume/` use it).
- The `.desktop` grid, `.intro`, `.runway`, and `runway-hint` in `index.astro`.
- `data-world="motion"` runway styling. `data-world` itself is kept for the credit line and anything else that checks it.

## Testing

- **Vitest, written first:**
  - `active-step.test.ts`: middle inside a step; in a gap (nearest wins); above the first and below the last; zero steps → -1; ties go to the earlier step.
  - `camera-path.test.ts` (rewritten):
    - every `StepId` has both shots
    - `shotFor` picks portrait below aspect 1
    - `tweenShot` at 0 is `from`, at 1 is `to`, at 0.5 is the midpoint (symmetric easing), and clamps out-of-range `t`
  - `buildings.test.ts` updated for the swapped positions.
- **Gates:** `npm test`, `npx astro check` (0 errors), `npx astro build`.
- **Manual (browser):**
  - 390×844 phone and 1440×900 desktop
  - light and dark themes
  - reduced motion
  - JS disabled
  - keyboard-only tab-through
  - `/#projects` deep link
  - contrast check on every glass text pairing

## Out of scope

- Sub-project A (real models). Voxel Cast Members stay as placeholders until then.
- Render-loop idle throttling, the raycast through walls, the WebGL context leak on a failed start, and `canvas.clientWidth` in resize. These are still tracked in the handoff.
