# Staged Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the all-at-once Desktop grid on `/` with five full-height Steps (Hello, Work, Projects, Blog, Contact) that reveal one at a time as dark glass cards over the World, while the camera glides to each Step's Host.

**Architecture:**
- A pure `activeStep` function and an inline Stage script decide which Step sits in the middle of the screen. The script marks that Step active, updates the rail and the URL hash, and fires a `stage:step` event.
- CSS fades the active card in.
- The World listens for `stage:step` and glides the camera between per-Step shots, using pure glide helpers. The shots are framed from each Host's anchor.
- Without JS or WebGL, every card is simply visible.

**Tech Stack:** Astro 7, TypeScript, three.js 0.186 (dynamic import on `/` only), Vitest 4, plain CSS. No UI framework.

**Spec:** `docs/superpowers/specs/2026-10-17-staged-homepage-design.md`

## Global Constraints

- No UI framework (ADR 0001). three.js only through the existing dynamic `import("../world/main")` in `World.astro` (ADR 0004). Never import `three` statically from a page or component script. `import type` is fine.
- WCAG AA: 4.5:1 for body text, 3:1 for large text and UI. The canvas stays `aria-hidden`. Nothing essential lives only in 3D.
- Inactive cards are never `hidden`, `inert`, or `aria-hidden`. All five Steps are server-rendered in DOM order Hello → Work → Projects → Blog → Contact.
- Reduced motion: no camera glide, no idles, no card animation, no scroll snap.
- No JS, no WebGL, or a failed import: the page still fully works, with all cards visible.
- `history.replaceState` must pass `history.state` through unchanged, because ClientRouter keeps its state there.
- Gates before every commit that touches code: `npm test`, `npx astro check` (0 errors), `npx astro build`.
- Code style: tabs, single quotes in `.ts`, double quotes in `.astro`, and 4-space indentation in `theme.css` (match the file). Use conventional commits.
- `src/data/resume.json` is generated. Never edit it by hand.
- Keep `src/components/Window.astro`: `/projects/` and `/resume/` use it.

## Review Focus

1. **Keyboard focus into a faded card.** Tab can move focus into a Step whose card is still at opacity 0, because the browser scrolled it into view but not to the middle. Expected: the Step becomes active on `focusin`. There's no DOM test environment, so Task 7 Step 3 checks this by hand.
2. **Hashes that aren't Steps.** For example, `#main` from the skip link, `#Projects`, or `#`. Expected: `stepFromHash` returns `'hello'` and nothing throws. Tested in Task 1.
3. **Fast scrolling across several Steps mid-glide.** Expected: the camera never jumps, because each retarget starts from the live camera position. Tested in Task 4 (`retarget` continuity).
4. **A Step taller than the screen on a phone (Work).** Expected: it stays active while you scroll inside it. Tested in Task 2.
5. **Rotating or resizing across aspect 1.** Expected: the shot switches between portrait and landscape at exactly `aspect < 1`. Tested in Task 4. Task 5 wires resize to retarget.

---

## File map

| File | Status | Responsibility |
|---|---|---|
| `src/stage/steps.ts` | create | Step ids, labels, kicker text, hash → step |
| `src/stage/active-step.ts` | create | Pure: which Step holds the viewport middle |
| `src/lib/contrast.ts` | create | Pure WCAG luminance, contrast ratio, alpha compositing |
| `src/styles/theme.css` | modify | Glass colour tokens |
| `src/styles/glass-contrast.test.ts` | create | Asserts glass tokens meet AA over white |
| `src/world/camera-path.ts` | rewrite | Per-Step framings, shots, glide helpers |
| `src/world/buildings.ts`, `characters/joker.ts`, `characters/phoenix.ts` | modify | Swap café ↔ courthouse so Phoenix stands west of Joker |
| `src/world/main.ts` | modify | Step-driven camera, `{ stop, goTo }` controller |
| `src/components/World.astro` | modify | Bridges `stage:step` → `goTo` |
| `src/components/StepCard.astro` | create | One full-height Step section with its glass card and reveal CSS |
| `src/components/Stage.astro` | create | Progress rail and the Stage controller script |
| `src/pages/index.astro` | rewrite | The five Steps |
| `src/assets/headshot.jpeg` | add | Copied from `~/Documents/headshot.jpeg` |
| `CONTEXT.md`, `docs/learning/09-staged-homepage.md` | modify/create | Domain terms and learning note |

---

### Task 1: Step model

**Files:**
- Create: `src/stage/steps.ts`
- Test: `src/stage/steps.test.ts`

**Interfaces:**
- Produces:
  - `STEPS: readonly { id: StepId; label: string }[]`
  - `type StepId = 'hello' | 'work' | 'projects' | 'blog' | 'contact'`
  - `isStepId(value: unknown): value is StepId`
  - `stepFromHash(hash: string): StepId`
  - `kicker(index: number): string`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { STEPS, isStepId, kicker, stepFromHash } from './steps';

describe('STEPS', () => {
	it('is the spec order', () => {
		expect(STEPS.map((s) => s.id)).toEqual(['hello', 'work', 'projects', 'blog', 'contact']);
	});
});

describe('isStepId', () => {
	it('accepts step ids only', () => {
		expect(isStepId('projects')).toBe(true);
		expect(isStepId('main')).toBe(false);
		expect(isStepId(undefined)).toBe(false);
		expect(isStepId(3)).toBe(false);
	});
});

describe('stepFromHash', () => {
	it('reads a step hash with or without the #', () => {
		expect(stepFromHash('#work')).toBe('work');
		expect(stepFromHash('contact')).toBe('contact');
	});

	it('falls back to hello for empty, foreign, or wrongly cased hashes', () => {
		expect(stepFromHash('')).toBe('hello');
		expect(stepFromHash('#')).toBe('hello');
		expect(stepFromHash('#main')).toBe('hello'); // the skip link
		expect(stepFromHash('#Projects')).toBe('hello');
	});
});

describe('kicker', () => {
	it('numbers from 01 with the label', () => {
		expect(kicker(0)).toBe('01 · Hello');
		expect(kicker(1)).toBe('02 · Work Experience');
		expect(kicker(4)).toBe('05 · Contact');
	});
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run src/stage/steps.test.ts`
Expected: FAIL. The run can't resolve `./steps`.

- [ ] **Step 3: Implement**

```ts
/** The Stage's Steps, in page order. Section ids, rail links, and camera shots are all keyed by these ids. */
export const STEPS = [
	{ id: 'hello', label: 'Hello' },
	{ id: 'work', label: 'Work Experience' },
	{ id: 'projects', label: 'Projects' },
	{ id: 'blog', label: 'Blog' },
	{ id: 'contact', label: 'Contact' },
] as const;

export type StepId = (typeof STEPS)[number]['id'];

export const isStepId = (value: unknown): value is StepId => STEPS.some((step) => step.id === value);

/** The Step a URL hash points at; anything else (the skip link's #main, typos) is Hello. */
export const stepFromHash = (hash: string): StepId => {
	const id = hash.replace(/^#/, '');
	return isStepId(id) ? id : 'hello';
};

/** Small label at the top of each card: "02 · Work Experience". */
export const kicker = (index: number): string => `${String(index + 1).padStart(2, '0')} · ${STEPS[index].label}`;
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `npx vitest run src/stage/steps.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/stage/steps.ts src/stage/steps.test.ts
git commit -m "feat: Stage step model"
```

---

### Task 2: Active step

**Files:**
- Create: `src/stage/active-step.ts`
- Test: `src/stage/active-step.test.ts`

**Interfaces:**
- Produces:
  - `interface StepRect { readonly top: number; readonly bottom: number }`. A `DOMRect` satisfies it.
  - `activeStep(rects: readonly StepRect[], viewportHeight: number): number`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { activeStep } from './active-step';

// Three 1000px-tall steps with 100px gaps, scrolled so the viewport (800px) starts at `scroll`.
const rects = (scroll: number) =>
	[0, 1100, 2200].map((top) => ({ top: top - scroll, bottom: top + 1000 - scroll }));

describe('activeStep', () => {
	it('picks the step containing the viewport middle', () => {
		expect(activeStep(rects(0), 800)).toBe(0); // middle at 400
		expect(activeStep(rects(1000), 800)).toBe(1); // middle at 1400
	});

	it('keeps a step taller than the viewport active while scrolling inside it', () => {
		for (let scroll = 700; scroll <= 1700; scroll += 50) expect(activeStep(rects(scroll), 800)).toBe(1);
	});

	it('picks the nearest step when the middle is in a gap', () => {
		expect(activeStep(rects(630), 800)).toBe(0); // middle at 1030: 30 below step 0, 70 above step 1
		expect(activeStep(rects(670), 800)).toBe(1); // middle at 1070: 70 below step 0, 30 above step 1
	});

	it('breaks an exact tie towards the earlier step', () => {
		expect(activeStep(rects(650), 800)).toBe(0); // middle at 1050: 50 from each
	});

	it('clamps above the first and below the last step', () => {
		expect(activeStep(rects(-2000), 800)).toBe(0);
		expect(activeStep(rects(9000), 800)).toBe(2);
	});

	it('returns -1 when there are no steps', () => {
		expect(activeStep([], 800)).toBe(-1);
	});
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run src/stage/active-step.test.ts`
Expected: FAIL. The run can't resolve `./active-step`.

- [ ] **Step 3: Implement**

```ts
export interface StepRect {
	readonly top: number;
	readonly bottom: number;
}

/** Index of the step containing the viewport's vertical middle; otherwise the nearest one (earlier wins ties). -1 for no steps. */
export const activeStep = (rects: readonly StepRect[], viewportHeight: number): number => {
	const middle = viewportHeight / 2;
	let best = -1;
	let bestDistance = Infinity;
	rects.forEach(({ top, bottom }, index) => {
		const distance = middle < top ? top - middle : middle > bottom ? middle - bottom : 0;
		if (distance < bestDistance) {
			best = index;
			bestDistance = distance;
		}
	});
	return best;
};
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `npx vitest run src/stage/active-step.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/stage/active-step.ts src/stage/active-step.test.ts
git commit -m "feat: activeStep picks the Step at the viewport middle"
```

---

### Task 3: Glass tokens with a contrast check

**Files:**
- Create: `src/lib/contrast.ts`, `src/lib/contrast.test.ts`, `src/styles/glass-contrast.test.ts`
- Modify: `src/styles/theme.css`. The new tokens go in the first `:root` block, after `--color-world-ground`.

**Interfaces:**
- Produces:
  - `type Rgb = readonly [number, number, number]`
  - `parseHex(hex: string): Rgb`
  - `luminance(rgb: Rgb): number`
  - `contrastRatio(a: Rgb, b: Rgb): number`
  - `composite(fg: Rgb, alpha: number, bg: Rgb): Rgb`
  - CSS tokens `--color-glass`, `--color-on-glass`, `--color-glass-muted`, `--color-glass-accent`, `--color-glass-border`. Tasks 6 and 7 use them.

- [ ] **Step 1: Write the failing tests**

`src/lib/contrast.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { composite, contrastRatio, parseHex } from './contrast';

describe('contrast', () => {
	it('parses 6-digit hex with or without #', () => {
		expect(parseHex('#1f7a45')).toEqual([31, 122, 69]);
		expect(parseHex('FFFFFF')).toEqual([255, 255, 255]);
		expect(() => parseHex('#fff')).toThrow('6-digit');
	});

	it('matches the WCAG reference ratios', () => {
		expect(contrastRatio([255, 255, 255], [0, 0, 0])).toBeCloseTo(21, 5);
		expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
		expect(contrastRatio([10, 20, 30], [10, 20, 30])).toBe(1);
		expect(contrastRatio(parseHex('#767676'), [255, 255, 255])).toBeCloseTo(4.54, 2);
	});

	it('composites a translucent colour over a background', () => {
		expect(composite([0, 0, 0], 0.5, [255, 255, 255])).toEqual([128, 128, 128]);
		expect(composite([14, 22, 20], 1, [255, 255, 255])).toEqual([14, 22, 20]);
	});
});
```

`src/styles/glass-contrast.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { composite, contrastRatio, parseHex, type Rgb } from '../lib/contrast';

const css = readFileSync(new URL('./theme.css', import.meta.url), 'utf8');

const token = (name: string): string => {
	const match = new RegExp(`--${name}:\\s*([^;]+);`).exec(css);
	if (!match) throw new Error(`theme.css has no --${name}`);
	return match[1].trim();
};

const glass = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/.exec(token('color-glass'));
if (!glass) throw new Error('--color-glass must be rgba(r, g, b, a)');
const fill: Rgb = [Number(glass[1]), Number(glass[2]), Number(glass[3])];
const alpha = Number(glass[4]);

// The World can show pure white (sky, snow, bright fog) behind a card, so test the glass over white: the worst case for light text.
const worstCase = composite(fill, alpha, [255, 255, 255]);

describe('glass card contrast (WCAG AA)', () => {
	it.each(['color-on-glass', 'color-glass-muted', 'color-glass-accent'])('%s on glass over white is at least 4.5:1', (name) => {
		expect(contrastRatio(parseHex(token(name)), worstCase)).toBeGreaterThanOrEqual(4.5);
	});
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run src/lib/contrast.test.ts src/styles/glass-contrast.test.ts`
Expected: FAIL. The run can't resolve `./contrast` and `../lib/contrast`.

- [ ] **Step 3: Implement `src/lib/contrast.ts`**

```ts
export type Rgb = readonly [number, number, number];

export const parseHex = (hex: string): Rgb => {
	const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
	if (!match) throw new Error(`Not a 6-digit hex colour: ${hex}`);
	const n = Number.parseInt(match[1], 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const channel = (c: number) => {
	const s = c / 255;
	return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

/** WCAG 2 relative luminance. */
export const luminance = ([r, g, b]: Rgb): number => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

/** WCAG 2 contrast ratio, 1–21, order-independent. */
export const contrastRatio = (a: Rgb, b: Rgb): number => {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
};

/** `fg` at `alpha` painted over an opaque `bg`, rounded to whole channels. */
export const composite = (fg: Rgb, alpha: number, bg: Rgb): Rgb =>
	fg.map((c, i) => Math.round(c * alpha + bg[i] * (1 - alpha))) as unknown as Rgb;
```

- [ ] **Step 4: Run `contrast.test.ts` and make sure it passes, and `glass-contrast.test.ts` still fails**

Run: `npx vitest run src/lib/contrast.test.ts src/styles/glass-contrast.test.ts`
Expected: `contrast.test.ts` PASSES. `glass-contrast.test.ts` FAILS with "theme.css has no --color-glass".

- [ ] **Step 5: Add the tokens to `src/styles/theme.css`**

Insert after `    --color-world-ground: #9fd99a;` in the first `:root` block. Use 4-space indentation, and don't copy the tokens into the dark-mode blocks:

```css

    /* Stage glass cards: the same dark glass in both themes, so these are not redefined for dark mode.
       glass-contrast.test.ts checks each text colour against this glass over pure white (the worst case). */
    --color-glass: rgba(14, 22, 20, 0.78);
    --color-on-glass: #ffffff;
    --color-glass-muted: #c5d3cc;
    --color-glass-accent: #9be3b4;
    --color-glass-border: rgba(155, 227, 180, 0.45);
```

Also change the stale comments on `--color-desk` and `--color-surface`:
- `/* the Desktop area behind Windows — a step darker than the page */` → `/* tinted chrome (nav) — a step darker than the page */`
- `/* Window panels, cards — pop off the tinted page */` → `/* Windows and cards on inner pages — pop off the tinted page */`

- [ ] **Step 6: Run all tests**

Run: `npm test`
Expected: PASS. Over white, the composited glass is about rgb(67, 73, 72), giving roughly 9:1 for white, 5.9:1 for muted, and 6.1:1 for accent.

- [ ] **Step 7: Commit**

```bash
git add src/lib/contrast.ts src/lib/contrast.test.ts src/styles/glass-contrast.test.ts src/styles/theme.css
git commit -m "feat: glass card colour tokens with an AA contrast test"
```

---

### Task 4: Camera shots and glide, with café and courthouse swapped

**Files:**
- Rewrite: `src/world/camera-path.ts`, `src/world/camera-path.test.ts`
- Modify:
  - `src/world/buildings.ts`, at the `PLACEMENTS` cafe and courthouse entries
  - `src/world/characters/joker.ts:8`
  - `src/world/characters/phoenix.ts:8`

**Interfaces:**
- Consumes: `STEPS` and `StepId` from `src/stage/steps.ts` (Task 1).
- Produces (all from `src/world/camera-path.ts`):
  - `type Vec3`
  - `interface CameraKey { position: Vec3; target: Vec3 }`
  - `interface Framing { castId: string; anchor: Vec3; side: 'left' | 'right'; distance: number }`
  - `FRAMINGS: Record<StepId, Framing>`
  - `frame(framing: Framing, layout: 'landscape' | 'portrait'): CameraKey`
  - `SHOTS: Record<StepId, { landscape: CameraKey; portrait: CameraKey }>`
  - `shotFor(step: StepId, aspect: number): CameraKey`
  - `GLIDE_SECONDS = 1.2`
  - `tweenShot(from: CameraKey, to: CameraKey, t: number): CameraKey`
  - `interface Glide { from: CameraKey; to: CameraKey; start: number }`, where `start` is in seconds
  - `still(shot: CameraKey): Glide`
  - `glideAt(glide: Glide, now: number): CameraKey`
  - `retarget(glide: Glide, to: CameraKey, now: number): Glide`
  - Removed: `CAMERA_KEYS`, `cameraAt`, `scrollProgress`. Only `main.ts` uses them, and Task 5 updates it.

The swap moves the café and Joker east, and the courthouse and Phoenix west, so the camera visits Minh → Phoenix → Joker → Isabelle → Reshiram west to east.

- [ ] **Step 1: Write the failing test** (replace the whole of `src/world/camera-path.test.ts`)

```ts
import { describe, expect, it } from 'vitest';
import { STEPS } from '../stage/steps';
import {
	FRAMINGS,
	GLIDE_SECONDS,
	SHOTS,
	frame,
	glideAt,
	retarget,
	shotFor,
	still,
	tweenShot,
	type CameraKey,
} from './camera-path';
import { cast } from './characters';
import { surfaceY } from './terrain';

const A: CameraKey = { position: [0, 0, 0], target: [10, 0, 0] };
const B: CameraKey = { position: [100, 50, -20], target: [110, 50, -20] };

const expectKey = (actual: CameraKey, expected: CameraKey) => {
	actual.position.forEach((v, i) => expect(v).toBeCloseTo(expected.position[i], 9));
	actual.target.forEach((v, i) => expect(v).toBeCloseTo(expected.target[i], 9));
};

describe('FRAMINGS', () => {
	it.each(STEPS.map((s) => [s.id] as const))('%s frames its Host where that Cast Member stands', (id) => {
		const { castId, anchor } = FRAMINGS[id];
		const member = cast.find((m) => m.id === castId);
		expect(member, `no Cast Member "${castId}"`).toBeDefined();
		expect([anchor[0], anchor[2]]).toEqual([...member!.position]);
		expect(anchor[1]).toBeGreaterThan(surfaceY(anchor[0], anchor[2]));
	});

	it('runs west to east in Step order so the camera never backtracks', () => {
		const xs = STEPS.map((s) => FRAMINGS[s.id].anchor[0]);
		expect([...xs].sort((a, b) => a - b)).toEqual(xs);
		expect(new Set(xs).size).toBe(xs.length);
	});
});

describe('frame', () => {
	const framing = { castId: 'x', anchor: [0, 7, 0], side: 'left', distance: 60 } as const;

	it('puts the Host left or right of centre in landscape (target shifted the other way)', () => {
		expect(frame(framing, 'landscape').target[0]).toBeGreaterThan(0);
		expect(frame({ ...framing, side: 'right' }, 'landscape').target[0]).toBeLessThan(0);
	});

	it('puts the Host above centre in portrait (target below the Host)', () => {
		const shot = frame(framing, 'portrait');
		expect(shot.target[1]).toBeLessThan(7);
		expect(shot.target[0]).toBe(0);
	});

	it('keeps the camera in front of (+z) and above the Host', () => {
		for (const layout of ['landscape', 'portrait'] as const) {
			const { position } = frame(framing, layout);
			expect(position[2]).toBeGreaterThan(0);
			expect(position[1]).toBeGreaterThan(7);
		}
	});
});

describe('shotFor', () => {
	it('has finite landscape and portrait shots for every Step', () => {
		for (const { id } of STEPS) {
			for (const shot of [SHOTS[id].landscape, SHOTS[id].portrait]) {
				expect([...shot.position, ...shot.target].every(Number.isFinite)).toBe(true);
			}
		}
	});

	it('switches to portrait strictly below aspect 1', () => {
		expect(shotFor('work', 0.999)).toBe(SHOTS.work.portrait);
		expect(shotFor('work', 1)).toBe(SHOTS.work.landscape);
		expect(shotFor('work', 16 / 9)).toBe(SHOTS.work.landscape);
	});
});

describe('tweenShot', () => {
	it('starts at from, ends at to, and is halfway at the midpoint', () => {
		expect(tweenShot(A, B, 0)).toBe(A);
		expect(tweenShot(A, B, 1)).toBe(B);
		expectKey(tweenShot(A, B, 0.5), { position: [50, 25, -10], target: [60, 25, -10] });
	});

	it('eases: slow at the ends, so a quarter of the time covers less than a quarter of the way', () => {
		expect(tweenShot(A, B, 0.25).position[0]).toBeLessThan(25);
		expect(tweenShot(A, B, 0.75).position[0]).toBeGreaterThan(75);
	});

	it('clamps out-of-range and non-finite t', () => {
		expect(tweenShot(A, B, -1)).toBe(A);
		expect(tweenShot(A, B, 3)).toBe(B);
		expect(tweenShot(A, B, Number.NaN)).toBe(A);
	});
});

describe('glide', () => {
	it('a still glide is its shot at any time', () => {
		expect(glideAt(still(A), 0)).toBe(A);
		expect(glideAt(still(A), 99)).toBe(A);
	});

	it('takes GLIDE_SECONDS from start to arrive', () => {
		// Float clocks (10 + 1.2 - 10 ≠ 1.2 exactly), so arrival is checked closely, and past-the-end exactly.
		const glide = { from: A, to: B, start: 10 };
		expect(glideAt(glide, 10)).toBe(A);
		expectKey(glideAt(glide, 10 + GLIDE_SECONDS), B);
		expect(glideAt(glide, 10 + GLIDE_SECONDS + 1)).toBe(B);
		expect(glideAt(glide, 5)).toBe(A);
	});

	it('retargeting mid-glide continues from the live position (no jump)', () => {
		const first = { from: A, to: B, start: 0 };
		const now = GLIDE_SECONDS * 0.4;
		const second = retarget(first, A, now);
		expectKey(glideAt(second, now), glideAt(first, now));
		expectKey(glideAt(second, now + GLIDE_SECONDS), A);
	});
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run src/world/camera-path.test.ts`
Expected: FAIL. The imports `FRAMINGS`, `frame`, and so on are not exported.

- [ ] **Step 3: Rewrite `src/world/camera-path.ts`**

```ts
import { STEPS, type StepId } from '../stage/steps';

export type Vec3 = readonly [number, number, number];

export interface CameraKey {
	position: Vec3;
	target: Vec3;
}

export interface Framing {
	/** The Cast Member this Step frames; camera-path.test.ts checks `anchor` matches where they stand. */
	castId: string;
	/** Host base x, a point roughly at body height, base z. */
	anchor: Vec3;
	/** Which side of the centred card the Host appears on in landscape. */
	side: 'left' | 'right';
	/** Camera distance from the Host, world units; bigger Hosts need more. */
	distance: number;
}

/** West to east so the camera never backtracks: Minh → Phoenix → Joker → Isabelle → Reshiram on his cliff. */
export const FRAMINGS: Record<StepId, Framing> = {
	hello: { castId: 'minh', anchor: [-60, 7, 12], side: 'left', distance: 60 },
	work: { castId: 'phoenix', anchor: [-34, 7, -8], side: 'right', distance: 60 },
	projects: { castId: 'joker', anchor: [6, 7, -6], side: 'left', distance: 60 },
	blog: { castId: 'isabelle', anchor: [40, 7, -6], side: 'right', distance: 60 },
	contact: { castId: 'reshiram', anchor: [74, 32, -4], side: 'left', distance: 110 },
};

/**
 * Landscape: the Host sits about a fifth of the way in from one edge, beside the centred card.
 * Portrait: the Host sits in the band above the card.
 */
export const frame = ({ anchor: [x, y, z], side, distance: d }: Framing, layout: 'landscape' | 'portrait'): CameraKey => {
	if (layout === 'portrait') return { position: [x, y + d * 0.3, z + d], target: [x, y - d * 0.22, z] };
	const shift = side === 'left' ? d * 0.4 : -d * 0.4;
	return { position: [x + shift, y + d * 0.35, z + d], target: [x + shift, y, z] };
};

export const SHOTS = Object.fromEntries(
	STEPS.map(({ id }) => [id, { landscape: frame(FRAMINGS[id], 'landscape'), portrait: frame(FRAMINGS[id], 'portrait') }]),
) as Record<StepId, { landscape: CameraKey; portrait: CameraKey }>;

/** The shot for a Step at a viewport aspect (width / height): portrait below 1. */
export const shotFor = (step: StepId, aspect: number): CameraKey =>
	aspect < 1 ? SHOTS[step].portrait : SHOTS[step].landscape;

export const GLIDE_SECONDS = 1.2;

const clamp01 = (value: number) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0);
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const lerp3 = (a: Vec3, b: Vec3, e: number): Vec3 => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];

/** Camera between two shots at glide progress t (0–1, clamped), eased in and out. Returns the endpoints themselves at 0 and 1. */
export const tweenShot = (from: CameraKey, to: CameraKey, t: number): CameraKey => {
	const e = easeInOutCubic(clamp01(t));
	if (e === 0) return from;
	if (e === 1) return to;
	return { position: lerp3(from.position, to.position, e), target: lerp3(from.target, to.target, e) };
};

/** A camera move in progress. `start` is in seconds on the caller's clock. */
export interface Glide {
	from: CameraKey;
	to: CameraKey;
	start: number;
}

export const still = (shot: CameraKey): Glide => ({ from: shot, to: shot, start: 0 });

export const glideAt = (glide: Glide, now: number): CameraKey =>
	tweenShot(glide.from, glide.to, (now - glide.start) / GLIDE_SECONDS);

/** A new glide to `to` that starts from wherever the camera is right now, so a change of mind never jumps. */
export const retarget = (glide: Glide, to: CameraKey, now: number): Glide => ({ from: glideAt(glide, now), to, start: now });
```

- [ ] **Step 4: Swap the café and courthouse**

In `src/world/buildings.ts`, `PLACEMENTS`:

```ts
	{ building: cafe, at: [-8, -40] },
	{ building: courthouse, at: [-56, -44] },
```

In `src/world/characters/joker.ts`: `position: [-30, -6],` → `position: [6, -6],`
In `src/world/characters/phoenix.ts`: `position: [8, -8],` → `position: [-34, -8],`

Search for any other mention of the old order:

Run: `grep -rn "café (Joker)\|courthouse (Phoenix)" src docs/learning`
Expected: no matches in `src/` once `CAMERA_KEYS` is gone.

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: `camera-path.test.ts`, `buildings.test.ts`, and `cast.test.ts` PASS. Every placement and Cast Member is still on land: (-56,-44), (-8,-40), (6,-6), and (-34,-8) all have ground at y=4.

Run: `npx astro check`
Expected: errors in `src/world/main.ts` only, because `cameraAt` and `scrollProgress` are gone. That's expected, and Task 5 fixes it. **Don't commit yet.** Go straight on to Task 5, and commit Tasks 4 and 5 together so `main` always type-checks.

---

### Task 5: Step-driven World controller

**Files:**
- Modify: `src/world/main.ts` (full replacement below)
- Modify: `src/components/World.astro` (the `<script>` block only)

**Interfaces:**
- Consumes: `shotFor`, `still`, `glideAt`, `retarget`, and `Glide` (Task 4); `StepId`, `isStepId`, and `stepFromHash` (Task 1).
- Produces:
  - `interface WorldOptions { reducedMotion: boolean; initialStep: StepId }`
  - `interface WorldController { stop(): void; goTo(step: StepId): void }`
  - `startWorld(canvas, bubble, options): Promise<WorldController>`
  - `World.astro` listens for `document` event `stage:step` with `detail: { index: number; id: StepId }`. Task 6 fires it.

- [ ] **Step 1: Replace `src/world/main.ts`**

Only the camera parts change from today's file. Theme, actors, speech, and dispose are unchanged.

```ts
import {
	Box3,
	CircleGeometry,
	Color,
	DirectionalLight,
	Fog,
	HemisphereLight,
	Mesh,
	MeshBasicMaterial,
	PerspectiveCamera,
	PointLight,
	Points,
	Scene,
	Vector3,
	WebGLRenderer,
	type Material,
	type Object3D,
} from 'three';
import type { StepId } from '../stage/steps';
import { glideAt, retarget, shotFor, still, type CameraKey, type Glide } from './camera-path';
import type { CastMember } from './cast';
import { cast } from './characters';
import { idlePose } from './idle';
import { loadCharacter } from './load-character';
import { createSpeech, hopHeight } from './speech';
import { surfaceY } from './terrain';
import { PRESETS, documentTheme, watchTheme, type WorldTheme } from './theme';
import { buildTown } from './town';

export interface WorldOptions {
	reducedMotion: boolean;
	/** The Step to frame first (from the Stage, or the URL hash before the Stage has spoken). */
	initialStep: StepId;
}

export interface WorldController {
	/** Frees every GPU resource and listener. */
	stop: () => void;
	/** Glides the camera to a Step's Host (cuts instantly with reduced motion). */
	goTo: (step: StepId) => void;
}

interface Actor {
	member: CastMember;
	object: Object3D;
	shadow: Mesh;
	seed: number;
	/** Seconds since start when the last hop began. */
	hopStart: number;
}

const disposeScene = (scene: Scene) =>
	scene.traverse((node) => {
		if (node instanceof Mesh || node instanceof Points) {
			node.geometry.dispose();
			const materials: Material[] = Array.isArray(node.material) ? node.material : [node.material];
			for (const material of materials) material.dispose();
		}
	});

/** Builds the World into `canvas` and starts it on `options.initialStep`. */
export const startWorld = async (
	canvas: HTMLCanvasElement,
	bubble: HTMLElement,
	options: WorldOptions,
): Promise<WorldController> => {
	const renderer = new WebGLRenderer({ canvas, antialias: true });
	const coarse = window.matchMedia('(pointer: coarse)').matches;
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, coarse ? 1.5 : 2));

	const scene = new Scene();
	const fog = new Fog(0xffffff, 140, 320);
	scene.fog = fog;
	const camera = new PerspectiveCamera(40, 1, 1, 1000);
	const hemi = new HemisphereLight();
	const sun = new DirectionalLight();
	sun.position.set(-60, 120, 80);
	scene.add(hemi, sun);

	const town = buildTown();
	scene.add(town.group);

	const shadowGeometry = new CircleGeometry(1, 20);
	const shadowMaterial = new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false });
	const size = new Vector3();
	const actors: Actor[] = await Promise.all(
		cast.map(async (member, index) => {
			const object = await loadCharacter(member.source);
			new Box3().setFromObject(object).getSize(size);
			const shadow = new Mesh(shadowGeometry, shadowMaterial);
			shadow.rotation.x = -Math.PI / 2;
			// Capped so Reshiram's wingspan doesn't spread a blob past the edge of his cliff.
			shadow.scale.setScalar(Math.min(10, Math.max(size.x, size.z) * 0.45));
			scene.add(object, shadow);
			return { member, object, shadow, seed: index * 1.7, hopStart: -Infinity };
		}),
	);

	const gengarGlow = new PointLight(0xb388ff, 0, 40);
	gengarGlow.position.set(0, 8, 4);
	actors.find((actor) => actor.member.id === 'gengar')?.object.add(gengarGlow);

	const applyTheme = (theme: WorldTheme) => {
		const preset = PRESETS[theme];
		scene.background = new Color(preset.sky);
		fog.color.set(preset.sky);
		hemi.color.set(preset.hemiSky);
		hemi.groundColor.set(preset.hemiGround);
		hemi.intensity = preset.hemiIntensity;
		sun.color.set(preset.sun);
		sun.intensity = preset.sunIntensity;
		town.seaMaterial.color.set(preset.sea);
		town.windowMaterial.color.set(preset.glow);
		town.stars.visible = preset.stars;
		gengarGlow.intensity = preset.gengarGlow;
	};

	const resize = () => {
		const { innerWidth: w, innerHeight: h } = window;
		renderer.setSize(w, h, false);
		camera.aspect = w / h;
		camera.fov = w < h ? 55 : 40;
		camera.updateProjectionMatrix();
	};

	const start = performance.now();
	const seconds = () => (performance.now() - start) / 1000;

	let step = options.initialStep;
	let glide: Glide = still(shotFor(step, 1)); // re-aimed for the real aspect right after the first resize()
	const aimCamera = (t: number) => {
		const { position, target } = glideAt(glide, t);
		camera.position.set(...position);
		camera.lookAt(...target);
	};

	const place = (actor: Actor, t: number) => {
		const [baseX, baseZ] = actor.member.position;
		const pose = idlePose(actor.member.idle, options.reducedMotion ? 0 : t, options.reducedMotion ? 0 : actor.seed);
		const x = baseX + pose.dx;
		const z = baseZ + pose.dz;
		const ground = surfaceY(x, z);
		const hop = options.reducedMotion ? 0 : hopHeight(t - actor.hopStart);
		actor.object.position.set(x, ground + pose.dy + hop, z);
		actor.object.rotation.set(0, pose.heading ?? actor.member.facing, pose.sway);
		actor.shadow.position.set(x, ground + 0.05, z);
	};

	const speech = createSpeech({
		camera,
		bubble,
		targets: actors.map(({ member, object }) => ({ member, object })),
		onPick: (id) => {
			const actor = actors.find((a) => a.member.id === id);
			if (actor) actor.hopStart = seconds();
			if (options.reducedMotion) render();
		},
	});
	const render = () => {
		renderer.render(scene, camera);
		speech.update();
	};

	/** Points the camera at `shot`: a cut with reduced motion, otherwise a glide from where it is now. */
	const moveTo = (shot: CameraKey) => {
		if (options.reducedMotion) {
			glide = still(shot);
			aimCamera(0);
			render();
		} else {
			glide = retarget(glide, shot, seconds());
		}
	};

	let frame = 0;
	const tick = (now: number) => {
		frame = requestAnimationFrame(tick);
		if (document.hidden) return;
		const t = (now - start) / 1000;
		aimCamera(t);
		for (const actor of actors) place(actor, t);
		render();
	};

	resize();
	applyTheme(documentTheme());
	glide = still(shotFor(step, camera.aspect));
	aimCamera(0);
	for (const actor of actors) place(actor, 0);

	const stopTheme = watchTheme((theme) => {
		applyTheme(theme);
		if (options.reducedMotion) render();
	});
	const onResize = () => {
		resize();
		moveTo(shotFor(step, camera.aspect));
	};
	window.addEventListener('resize', onResize);

	if (options.reducedMotion) render();
	else frame = requestAnimationFrame(tick);
	canvas.classList.add('ready');
	performance.mark('world:start');

	return {
		stop: () => {
			cancelAnimationFrame(frame);
			window.removeEventListener('resize', onResize);
			stopTheme();
			speech.dispose();
			disposeScene(scene);
			renderer.dispose();
			renderer.forceContextLoss();
			canvas.classList.remove('ready');
			performance.mark('world:stop');
		},
		goTo: (next) => {
			if (next === step) return;
			step = next;
			moveTo(shotFor(step, camera.aspect));
		},
	};
};
```

- [ ] **Step 2: Replace the `<script>` in `src/components/World.astro`**

Leave the markup and `<style>` unchanged.

```astro
<script>
	import { isStepId, stepFromHash, type StepId } from "../stage/steps";
	import type { WorldController } from "../world/main";

	let world: WorldController | null = null;
	/** The Step to frame. Stage events keep it current even before the World has finished starting. */
	let step: StepId = stepFromHash(location.hash);

	document.addEventListener("stage:step", (event) => {
		const id = (event as CustomEvent<{ id?: unknown }>).detail?.id;
		if (!isStepId(id)) return;
		step = id;
		world?.goTo(id);
	});

	const hasWebGL = () => {
		try {
			const probe = document.createElement("canvas");
			const gl = probe.getContext("webgl2") ?? probe.getContext("webgl");
			gl?.getExtension("WEBGL_lose_context")?.loseContext();
			return gl !== null;
		} catch {
			return false;
		}
	};

	const whenIdle = (callback: () => void) =>
		"requestIdleCallback" in window ? window.requestIdleCallback(callback, { timeout: 2000 }) : setTimeout(callback, 200);

	document.addEventListener("astro:page-load", () => {
		const canvas = document.querySelector<HTMLCanvasElement>("canvas[data-world]");
		const bubble = document.querySelector<HTMLElement>("[data-world-speech]");
		if (!canvas || !bubble || !hasWebGL()) return;
		const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

		whenIdle(async () => {
			if (!canvas.isConnected) return; // navigated away before idle
			try {
				const { startWorld } = await import("../world/main");
				if (!canvas.isConnected) return;
				const started = await startWorld(canvas, bubble, { reducedMotion, initialStep: step });
				// Navigated away while the World was building: stop it at once.
				if (!canvas.isConnected) return started.stop();
				world = started;
				world.goTo(step); // a Stage event may have arrived while the World was building
				document.documentElement.dataset.world = reducedMotion ? "still" : "motion";
			} catch (error) {
				console.error("World failed to start; keeping the gradient.", error);
			}
		});
	});

	document.addEventListener("astro:before-swap", () => {
		world?.stop();
		world = null;
		delete document.documentElement.dataset.world;
	});
</script>
```

- [ ] **Step 3: Run the gates**

Run: `npm test && npx astro check && npx astro build`
Expected: all tests pass, `astro check` reports 0 errors, and the build succeeds. The old homepage still renders. The camera holds on Minh's shot because nothing fires `stage:step` yet.

- [ ] **Step 4: Commit Tasks 4 and 5 together**

```bash
git add src/world/camera-path.ts src/world/camera-path.test.ts src/world/buildings.ts src/world/characters/joker.ts src/world/characters/phoenix.ts src/world/main.ts src/components/World.astro
git commit -m "feat: per-Step camera shots with eased glides; World follows stage:step"
```

---

### Task 6: StepCard, Stage, and the new homepage

**Files:**
- Add: `src/assets/headshot.jpeg` (`cp ~/Documents/headshot.jpeg src/assets/headshot.jpeg`)
- Create: `src/components/StepCard.astro`, `src/components/Stage.astro`
- Rewrite: `src/pages/index.astro`

**Interfaces:**
- Consumes:
  - `STEPS` and `kicker` (Task 1)
  - `activeStep` (Task 2)
  - the glass tokens (Task 3)
  - the `stage:step` listener in `World.astro` (Task 5)
- Produces:
  - `<StepCard index={n} center?>`, rendering `<section class="step" id={STEPS[n].id} data-step>` with a `.card` (`data-world-solid`), a default slot, and an `after` slot
  - `<Stage />`, rendering the rail and running the controller
  - the `stage:step` event, `{ detail: { index: number; id: string } }`

- [ ] **Step 1: Copy the headshot**

Run: `cp ~/Documents/headshot.jpeg src/assets/headshot.jpeg && sips -g pixelWidth src/assets/headshot.jpeg`
Expected: `pixelWidth: 400`.

- [ ] **Step 2: Create `src/components/StepCard.astro`**

```astro
---
// One Step of the homepage Stage: a full-height section holding one glass card.
// The card fades in only once the Stage script has started (:root[data-stage]); without JS every card is simply visible.
import { STEPS, kicker } from "../stage/steps";

interface Props {
	index: number;
	/** Centre the card's text (the Hello card). */
	center?: boolean;
}

const { index, center = false } = Astro.props;
const { id } = STEPS[index];
---

<section class="step" id={id} data-step>
	<div class:list={["card", { center }]} data-world-solid>
		<p class="kicker">{kicker(index)}</p>
		<slot />
	</div>
	<slot name="after" />
</section>

<style>
	.step {
		display: grid;
		place-items: center;
		align-content: center;
		gap: 1rem;
		min-height: 100svh;
		padding-block: 2rem;
	}

	.card {
		width: min(40rem, 100%);
		padding: clamp(1.25rem, 4vw, 2rem);
		color: var(--color-on-glass);
		background: var(--color-glass);
		-webkit-backdrop-filter: blur(12px);
		backdrop-filter: blur(12px);
		border: 1.5px solid var(--color-glass-border);
		border-radius: var(--radius);
		box-shadow: 0 12px 40px rgb(0 0 0 / 0.25);
	}

	.center {
		text-align: center;
	}

	.kicker {
		margin: 0 0 0.5rem;
		max-width: none;
		font-family: var(--font-heading);
		font-size: 0.8rem;
		font-weight: 600;
		letter-spacing: 0.15em;
		text-transform: uppercase;
		color: var(--color-glass-accent);
	}

	.card :global(h2) {
		margin: 0 0 1.25rem;
		font-size: clamp(1.6rem, 5vw, 2.2rem);
	}

	.card :global(a) {
		color: var(--color-glass-accent);
	}

	.card :global(:focus-visible) {
		outline-color: var(--color-glass-accent);
	}

	/* Reveal: only the active Step's card shows. Faded cards stay in the accessibility tree. */
	:global(:root[data-stage]) .card {
		transition:
			opacity 500ms ease-out,
			transform 500ms ease-out;
	}

	:global(:root[data-stage]) .step:not([data-active]) .card {
		opacity: 0;
		transform: translateY(2rem);
	}

	@media (prefers-reduced-motion: reduce) {
		:global(:root[data-stage]) .card {
			transition: none;
		}

		:global(:root[data-stage]) .step:not([data-active]) .card {
			opacity: 0.15;
			transform: none;
		}
	}

	@media (min-width: 768px) and (min-height: 600px) and (prefers-reduced-motion: no-preference) {
		:global(:root[data-stage]) {
			scroll-snap-type: y proximity;
		}

		.step {
			scroll-snap-align: center;
		}
	}
</style>
```

- [ ] **Step 3: Create `src/components/Stage.astro`**

```astro
---
// The homepage Stage controller and its progress rail.
// Marks the Step at the middle of the screen active, mirrors it in the rail and the URL hash,
// and announces it with a `stage:step` event (World.astro moves the camera on it).
import { STEPS } from "../stage/steps";
---

<nav class="rail" aria-label="Sections" data-rail>
	<span class="bar" aria-hidden="true"></span>
	<ol>
		{
			STEPS.map(({ id, label }) => (
				<li>
					<a href={`#${id}`}>
						<span class="label">{label}</span>
					</a>
				</li>
			))
		}
	</ol>
</nav>

<script>
	import { activeStep } from "../stage/active-step";

	let teardown: (() => void) | null = null;

	document.addEventListener("astro:page-load", () => {
		const sections = [...document.querySelectorAll<HTMLElement>("[data-step]")];
		const rail = document.querySelector<HTMLElement>("[data-rail]");
		if (sections.length === 0 || !rail) return;
		const links = [...rail.querySelectorAll<HTMLAnchorElement>("a")];
		const root = document.documentElement;
		let current = -1;
		let frame = 0;

		const setActive = (index: number) => {
			if (index < 0 || index === current) return;
			current = index;
			const { id } = sections[index];
			sections.forEach((section, i) => section.toggleAttribute("data-active", i === index));
			for (const link of links) {
				if (link.hash === `#${id}`) link.setAttribute("aria-current", "step");
				else link.removeAttribute("aria-current");
			}
			rail.style.setProperty("--stage-progress", String((index + 1) / sections.length));
			// Keep history.state: ClientRouter stores its navigation state there.
			history.replaceState(history.state, "", index === 0 ? location.pathname + location.search : `#${id}`);
			document.dispatchEvent(new CustomEvent("stage:step", { detail: { index, id } }));
		};

		const update = () => {
			frame = 0;
			setActive(activeStep(sections.map((section) => section.getBoundingClientRect()), window.innerHeight));
		};
		const schedule = () => {
			if (frame === 0) frame = requestAnimationFrame(update);
		};
		// The browser scrolls a focused element into view but not to the middle, so focus decides the Step directly.
		const onFocus = (event: FocusEvent) => {
			const index = sections.findIndex((section) => section.contains(event.target as Node));
			if (index >= 0) setActive(index);
		};

		root.dataset.stage = "";
		update();
		window.addEventListener("scroll", schedule, { passive: true });
		window.addEventListener("resize", schedule);
		document.addEventListener("focusin", onFocus);

		teardown = () => {
			cancelAnimationFrame(frame);
			window.removeEventListener("scroll", schedule);
			window.removeEventListener("resize", schedule);
			document.removeEventListener("focusin", onFocus);
			delete root.dataset.stage;
		};
	});

	document.addEventListener("astro:before-swap", () => {
		teardown?.();
		teardown = null;
	});
</script>

<style>
	.rail {
		position: fixed;
		z-index: 10;
		top: 50%;
		right: 1rem;
		transform: translateY(-50%);
	}

	ol {
		display: grid;
		gap: 0.25rem;
		margin: 0;
		padding: 0.4rem;
		list-style: none;
		background: var(--color-glass);
		border: 1.5px solid var(--color-glass-border);
		border-radius: 999px;
	}

	/* 24px hit area (WCAG 2.5.8) around a 12px dot. */
	a {
		position: relative;
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		border-radius: 50%;
	}

	a::before {
		content: "";
		width: 12px;
		height: 12px;
		border: 2px solid var(--color-glass-accent);
		border-radius: 50%;
	}

	a[aria-current="step"]::before {
		background: var(--color-glass-accent);
	}

	a:focus-visible {
		outline-color: var(--color-glass-accent);
	}

	.label {
		position: absolute;
		top: 50%;
		right: calc(100% + 0.6rem);
		padding: 0.15rem 0.7rem;
		white-space: nowrap;
		font-size: 0.85rem;
		color: var(--color-on-glass);
		background: var(--color-glass);
		border-radius: 999px;
		transform: translateY(-50%);
		opacity: 0;
		pointer-events: none;
		transition: opacity 150ms;
	}

	a:hover .label,
	a:focus-visible .label {
		opacity: 1;
	}

	.bar {
		display: none;
	}

	/* Phones: a thin progress bar along the top; the dots appear only while one has keyboard focus. */
	@media (max-width: 767px) {
		.rail {
			top: 0;
			right: 0;
			left: 0;
			transform: none;
		}

		.bar {
			display: block;
			height: 4px;
			background: var(--color-glass-accent);
			transform: scaleX(var(--stage-progress, 0));
			transform-origin: left;
			transition: transform 300ms ease-out;
		}

		.rail:not(:focus-within) ol {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip-path: inset(50%);
		}

		.rail:focus-within ol {
			position: absolute;
			top: 0.75rem;
			right: 0.75rem;
			grid-auto-flow: column;
		}

		.label {
			display: none;
		}
	}

	:global(:root:not([data-stage])) .bar {
		display: none;
	}

	@media (prefers-reduced-motion: reduce) {
		.bar,
		.label {
			transition: none;
		}
	}
</style>
```

- [ ] **Step 4: Rewrite `src/pages/index.astro`**

```astro
---
import { Image } from "astro:assets";
import { getCollection } from "astro:content";
import headshot from "../assets/headshot.jpeg";
import ProjectLogo from "../components/ProjectLogo.astro";
import Stage from "../components/Stage.astro";
import StepCard from "../components/StepCard.astro";
import World from "../components/World.astro";
import Layout from "../layouts/Layout.astro";
import { getVisiblePosts } from "../lib/content";
import { sortProjects } from "../lib/projects";
import { resume } from "../lib/resume-data";

const projects = sortProjects(await getCollection("projects")).slice(0, 3);
const posts = (await getVisiblePosts()).slice(0, 2);
const formatDate = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });
---

<Layout title="Home">
	<World />
	<Stage />

	<StepCard index={0} center>
		<Image src={headshot} alt={resume.name} width={200} height={200} loading="eager" class="photo" />
		<h1 class="name">{resume.name}</h1>
		<p class="tagline">
			Software engineering student at Drexel University building backend, infrastructure, and applied-AI systems.
		</p>
		<p class="seeking">Looking for Summer 2027 internships.</p>
		<div class="chips">
			<a href="#work">Work ↓</a>
			<a href="#projects">Projects ↓</a>
			<a href="#contact">Contact ↓</a>
		</div>
	</StepCard>

	<StepCard index={1}>
		<h2>Where I've worked</h2>
		<ol class="entries">
			{
				resume.experience.map((job) => (
					<li>
						<h3>
							{job.role} · {job.company}
						</h3>
						<p class="when">
							{job.startDate} – {job.endDate || "Present"}
						</p>
						{job.highlights[0] && <p>{job.highlights[0]}</p>}
					</li>
				))
			}
		</ol>
		<a class="more" href="/work/">See all experience →</a>
	</StepCard>

	<StepCard index={2}>
		<h2>Things I've built</h2>
		<ul class="entries">
			{
				projects.map((project) => (
					<li class="project">
						<ProjectLogo title={project.data.title} logo={project.data.logo} badge={project.data.monogram} size={48} />
						<div>
							<h3>
								<a href={`/projects/${project.id}/`}>{project.data.title}</a>
							</h3>
							<p>{project.data.description}</p>
							<ul class="tech">
								{project.data.techStack.slice(0, 4).map((tech) => (
									<li>{tech}</li>
								))}
							</ul>
						</div>
					</li>
				))
			}
		</ul>
		<a class="more" href="/projects/">All projects →</a>
	</StepCard>

	<StepCard index={3}>
		<h2>Writing</h2>
		{
			posts.length === 0 ? (
				<p class="entries">Posts coming soon.</p>
			) : (
				<ul class="entries">
					{posts.map((post) => (
						<li>
							<h3>
								<a href={`/blog/${post.id}/`}>{post.data.title}</a>
							</h3>
							<p class="when">
								<time datetime={post.data.date.toISOString()}>{formatDate.format(post.data.date)}</time>
							</p>
							<p>{post.data.description}</p>
						</li>
					))}
				</ul>
			)
		}
		<a class="more" href="/blog/">All posts →</a>
	</StepCard>

	<StepCard index={4}>
		<h2>Say hello</h2>
		<p>The fastest way to reach me is email.</p>
		<div class="buttons">
			<a class="button email" href={`mailto:${resume.contact.email}`}>{resume.contact.email}</a>
			<a class="button" href={resume.contact.linkedin}>LinkedIn</a>
			<a class="button" href={resume.contact.github}>GitHub</a>
			<a class="button" href="/resume/">Résumé</a>
		</div>
		<p slot="after" class="credit" data-world-solid>
			Characters © Nintendo / Game Freak / The Pokémon Company / Atlus / Capcom. Fan art.
		</p>
	</StepCard>
</Layout>

<style>
	.photo {
		display: block;
		width: 200px;
		height: 200px;
		margin: 0.5rem auto 0;
		object-fit: cover;
		border: 4px solid var(--color-glass-accent);
		border-radius: 50%;
	}

	.name {
		margin: 1rem 0 0.25rem;
		font-size: clamp(2.2rem, 7vw, 3.2rem);
	}

	.tagline {
		margin: 0 auto;
		font-size: 1.15rem;
	}

	.seeking {
		margin: 0.5rem auto 1.25rem;
		font-family: var(--font-heading);
		font-weight: 600;
		color: var(--color-glass-accent);
	}

	.chips,
	.buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.chips {
		justify-content: center;
	}

	.chips a,
	.button {
		padding: 0.4rem 1rem;
		font-family: var(--font-heading);
		font-weight: 600;
		color: var(--color-on-glass);
		text-decoration: none;
		border: 2px solid var(--color-glass-accent);
		border-radius: 999px;
	}

	.chips a:hover,
	.button:hover {
		color: #0f1a14; /* ink on mint: ≈13:1 */
		background: var(--color-glass-accent);
	}

	.email {
		overflow-wrap: anywhere;
	}

	.entries {
		display: grid;
		gap: 1.25rem;
		margin: 0 0 1.5rem;
		padding: 0;
		list-style: none;
	}

	.entries h3 {
		margin: 0;
		font-size: 1.1rem;
	}

	.entries p {
		margin: 0;
	}

	.entries .when {
		margin: 0.1rem 0 0.35rem;
		font-size: 0.95rem;
		color: var(--color-glass-muted);
	}

	.project {
		display: grid;
		grid-template-columns: 48px 1fr;
		gap: 1rem;
		align-items: start;
	}

	.tech {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin: 0.5rem 0 0;
		padding: 0;
		list-style: none;
	}

	.tech li {
		padding: 0.05rem 0.55rem;
		font-size: 0.8rem;
		border: 1.5px solid var(--color-glass-border);
		border-radius: 999px;
	}

	.more {
		font-family: var(--font-heading);
		font-weight: 600;
	}

	.credit {
		display: none;
		width: fit-content;
		max-width: none;
		margin: 0;
		padding: 0.25rem 0.75rem;
		font-size: 0.8rem;
		color: var(--color-muted);
		background: var(--color-surface);
		border-radius: 999px;
	}

	:global(:root[data-world]) .credit {
		display: block;
	}
</style>
```

- [ ] **Step 5: Run the gates**

Run: `npm test && npx astro check && npx astro build`
Expected: all pass with 0 errors. Then confirm the built HTML has all five Steps in order, the rail, and no Window:

Run: `grep -o 'id="\(hello\|work\|projects\|blog\|contact\)"' dist/index.html && grep -c 'class="window' dist/index.html`
Expected: the five ids in order hello, work, projects, blog, contact, followed by `0`.

- [ ] **Step 6: Commit**

```bash
git add src/assets/headshot.jpeg src/components/StepCard.astro src/components/Stage.astro src/pages/index.astro
git commit -m "feat: staged homepage with glass Step cards and a progress rail"
```

---

### Task 7: Browser verification and shot tuning

**Files:**
- Possibly modify: `src/world/camera-path.ts` (`FRAMINGS` and the `frame` multipliers only)

- [ ] **Step 1: Start the dev server**

Run: `npx astro dev --background` then `npx astro dev status`
Expected: running. Note the URL (usually `http://localhost:4321/`).

- [ ] **Step 2: Tune the shots at 1440×900 and 390×844**

Open `/` in the browser (Claude in Chrome or the built-in browser) and scroll through every Step at both sizes. Each Step passes when:
- **Landscape:** the Host is fully visible, standing clear of the centred card on its `side`, and not cut off by the screen edge.
- **Portrait:** the Host is visible in the band above the card (at least the head and shoulders).
- **Contact:** Reshiram is on the cliff.

If a shot fails, change only that Step's `FRAMINGS` entry (`distance`, `side`, or the anchor's y) or the `frame` multipliers. Then rerun `npx vitest run src/world/camera-path.test.ts`, which must still pass because the anchor x/z values are pinned to the Cast Members. Record the final values in the commit message.

- [ ] **Step 3: Behaviour checklist**

Check each item and note the result:

1. Scrolling down shows exactly one card at a time, and the previous card fades out. The camera glides to the next Host and holds while you read.
2. Fast flick-scrolling from Hello to Contact: the camera never jumps. It turns smoothly towards the newest target.
3. At 390×844, the Work card is taller than the screen. Scrolling inside it keeps Work active and the card visible.
4. The rail dots highlight the current Step. Clicking a dot jumps there. The skip chips jump to Work, Projects, and Contact.
5. The URL hash follows the Step (`#work`, …), and Hello clears it. The Back button leaves the page normally, without walking back through Steps.
6. Load `/#projects` fresh: it opens on Projects, with Joker framed.
7. Keyboard only: Tab from the top through every link. Every focused link is visible (its card becomes active) and the focus ring is visible on the glass. *(Review Focus 1.)*
8. Navigate to `/projects/` with the nav, then back to Home: the Stage still works, there are no duplicate `stage:step` handlers (the camera moves once per change), and no console errors.
9. Toggle dark mode: the cards look the same, and the World switches to night.
10. Emulate `prefers-reduced-motion: reduce` (DevTools → Rendering): no fade or slide, inactive cards dimmed to 15%, camera cuts, no snap.
11. Disable JavaScript: all five cards are visible and stacked over the gradient, and the rail links still jump.
12. Click a Cast Member outside a card: it hops and talks. Clicking inside a card doesn't trigger a Cast Member.
13. Rotate or resize between portrait and landscape: the camera re-frames the current Host.

Fix any failures within the owning file before continuing, and rerun the gates afterwards.

- [ ] **Step 4: Stop the server and commit any tuning**

Run: `npx astro dev stop`

```bash
git add src/world/camera-path.ts
git commit -m "fix: tune Stage camera framings after browser check"
```

(Skip the commit if nothing changed.)

---

### Task 8: Domain language and learning note

**Files:**
- Modify: `CONTEXT.md`
- Create: `docs/learning/09-staged-homepage.md`

- [ ] **Step 1: Update `CONTEXT.md`**

Delete the whole **Desktop** entry (definition and _Avoid_ line). Replace the **Window** entry with:

```markdown
**Window**:
A static, non-draggable styled panel with a title bar, used for Project cards and on the Resume page.
_Avoid_: Card, tile, icon
```

After the **World** entry, add:

```markdown
**Stage**:
The homepage as a sequence of Steps revealed one at a time over the World as the page scrolls.
_Avoid_: Slideshow, carousel

**Step**:
One full-height section of the Stage (Hello, Work Experience, Projects, Blog, Contact) holding a single glass card. Only the active Step's card is shown; the others stay in the page for keyboard, screen-reader and no-JS users.
_Avoid_: Slide, panel, page

**Host**:
The Cast Member the camera frames for a Step: Minh (Hello), Phoenix Wright (Work Experience), Joker (Projects), Isabelle (Blog), Reshiram (Contact).
_Avoid_: Guide, mascot
```

In the **World** entry, replace "the camera travels across it as the page scrolls" with "the camera glides to each Step's Host as the Stage advances".

Replace the first sentence of the **Theme** paragraph:
- Old: "Cute and game-like but recruiter-readable: a retro-desktop metaphor structures the homepage, with playful accents (…)"
- New: "Cute and game-like but recruiter-readable: the homepage is a Stage of dark frosted-glass cards over the World, with playful accents (…)"

Keep the parenthetical list of accents unchanged. In the same paragraph, change "with white panels so content stands off the page" to "with white panels on inner pages so content stands off the page".

- [ ] **Step 2: Create `docs/learning/09-staged-homepage.md`**

```markdown
# 09 — Staged homepage

## What we built

- The homepage is now a Stage of five full-height Steps: Hello (photo, name, tagline), Work Experience, Projects, Blog, Contact. Only the Step at the middle of the screen shows its card; the others fade out.
- Each card is dark frosted glass centred over the World. The camera glides to that Step's Host (Minh, Phoenix Wright, Joker, Isabelle, Reshiram) and holds still while you read.
- A progress rail (dots on desktop, a thin bar on phones) and "skip to" chips on Hello jump straight to a Step; the URL hash follows along, so `/#projects` is shareable.
- Without JavaScript every card is visible and stacked; without WebGL the cards still reveal over the gradient; with reduced motion nothing slides and the camera cuts.

## Key concepts

### One signal, many listeners
`activeStep(rects, viewportHeight)` is a pure function: which Step's box contains the middle of the screen, else the nearest. The Stage script runs it once per animation frame while scrolling and broadcasts the answer as a `stage:step` event. CSS (`data-active`), the rail (`aria-current`), the URL and the World all react to that one event; the Stage doesn't know the World exists.

### Hiding visually, not semantically
Inactive cards are `opacity: 0`, never `hidden` or `inert`, so screen readers and keyboard users still reach everything in order. Because the browser scrolls a focused link into view but not necessarily to the middle, focusing anything inside a Step makes that Step active directly.

### Camera glides instead of a scroll curve
Each Step has a framing: where its Host stands and which side of the card to show them on. `frame()` turns that into a landscape and a portrait shot. Moving between shots is a `Glide` (`from`, `to`, `start`) eased with ease-in-out cubic over 1.2 s. Changing your mind mid-glide calls `retarget`, which starts the new glide from wherever the camera is right now, so it never jumps.

### Contrast as a test
The glass is translucent, so its real colour depends on what's behind it. `glass-contrast.test.ts` reads the tokens from `theme.css`, composites the glass over pure white (the worst case for light text), and fails the build if any text colour drops below WCAG AA.
```

- [ ] **Step 3: Commit**

```bash
git add CONTEXT.md docs/learning/09-staged-homepage.md
git commit -m "docs: Stage, Step and Host terms; staged homepage learning note"
```

- [ ] **Step 4: Final gates**

Run: `npm test && npx astro check && npx astro build`
Expected: all pass, 0 errors.
