# Meadow World Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the voxel town and its moving camera with a procedural low-poly meadow, seen from one fixed camera, with swaying grass, trees, drifting clouds and dusk fireflies.

**Architecture:** The scene's layout and the GPU tier logic are pure TypeScript in `src/world/meadow/` (`layout.ts`, `quality.ts`), and neither file imports `three`. One small three.js module per scene part builds from that layout (sky, ground, grass, trees, clouds, fireflies), and `meadow.ts` assembles them behind a single `buildMeadow(tier)` interface. `main.ts` keeps the renderer, the dormant Host code and the frame loop, but loses the town, the camera glide and `goTo`.

**Tech Stack:** Astro 7, three.js 0.186 (`three` plus `three/addons/utils/BufferGeometryUtils.js`), vitest 4, TypeScript.

**Spec:** `docs/superpowers/specs/2026-10-19-meadow-world-design.md`

## Global Constraints

- Tabs for indentation. Single quotes in `.ts`, double quotes in `.astro`. Conventional commits (`feat:`, `refactor:`, `docs:`, `chore:`).
- Run `npm test`, `npx astro check` and `npx astro build` before every commit. All three must pass.
- `src/world/meadow/layout.ts`, `src/world/meadow/quality.ts`, `src/world/meadow/palette.ts` and `src/world/characters/*` never import `three`.
- No new npm dependencies. `three/addons/...` ships inside `three`.
- Every ambient motion freezes under `prefers-reduced-motion: reduce`: one still render, redrawn only on resize or theme change.
- The `?world=low|medium|high` override and the `[world] tier=… avg=…ms` console line exist only when `import.meta.env.DEV` is true.
- Grass tiers: high 60,000 blades / pixel ratio cap 2 / 60 fps; medium 25,000 / 1.5 / 60 fps; low 8,000 / 1 / 30 fps. Drop a tier when the average frame time is above 22 ms. Never raise the tier during a visit.
- Light theme is day; dark theme is dusk. The `--color-world-sky` and `--color-world-ground` tokens in `theme.css` equal each preset's `skyHorizon` and `grassNear`.
- Don't touch the glass cards, the mint text, the mandatory desktop snap, or the CSS gradient fallback mechanism.
- The World's gzipped JS chunk (`dist/_astro/main.*.js`) was **169,660 bytes** at commit `0b566a3`. Flag it if it grows past **190,140 bytes** (+20 KB).

**Deviations from the spec, decided while planning:**
- **Camera height:** the camera sits at y = 5, not "head height on a person" (Hosts are 17 units tall). At y = 14, the bottom edge of the screen would only meet ground about 44 units out, so the foreground grass and the clearing would be out of shot. At y = 5, the ground is visible from about 17 units out.
- **No `dispose()` on `Meadow`:** `main.ts` already disposes the whole scene with `disposeObject(scene)`, and that covers the meadow.
- **Draw calls:** each tree is 2 meshes and each cloud is 1, so the scene is about 25 draw calls, not about 10. That is still trivial; the grass is one draw call either way.

## Review Focus

These are inputs the spec implies but doesn't spell out. Each line names the test that pins it.

1. **The tab is hidden partway through the frame-time measurement.** When the tab returns, the gap must not count as a slow frame or cause a tier drop. Pinned by: `recordFrame` ignores samples over 250 ms (Task 2). `main.ts` also resets the monitor while the tab is hidden (Task 7).
2. **A degenerate screen shape** (`aspect` of 0, negative, `NaN` or `Infinity`, e.g. a zero-height window mid-resize) must still give a finite field of view between 40° and 75°. Pinned by: `verticalFov` degenerate-aspect cases (Task 1).
3. **Safari and Firefox have no `navigator.deviceMemory`.** A missing hint must not push a capable laptop down to a lower tier. Pinned by: the `pickTier` rows without `memoryGB` (Task 2).
4. **`setTier` asks for more blades than the mesh was built with.** It must clamp to the built count, not overrun the instance buffer. Pinned by: the grass `setCount` clamp test (Task 4) and the meadow `setTier` test (Task 6).
5. **The theme is toggled under reduced motion.** The single redraw must already show the dusk extras (stars, fireflies), so `applyTheme` must flip visibility synchronously. Pinned by: the meadow `applyTheme` visibility test (Task 6); `main.ts` re-renders after `applyTheme` under reduced motion (Task 7).

## File map

| File | Status | Responsibility |
|---|---|---|
| `src/world/meadow/layout.ts` | create | The scene as data: seeded random numbers, `heightAt`, camera, `verticalFov`, `project`, trees, clearing, grass blades, mountains, clouds, fireflies, stars, sun |
| `src/world/meadow/layout.test.ts` | create | Unit tests for `layout.ts` |
| `src/world/meadow/quality.ts` | create | `Tier`, `TIERS`, `pickTier`, `nextTier`, frame monitor, `tierOverride` |
| `src/world/meadow/quality.test.ts` | create | Unit tests for `quality.ts` |
| `src/world/meadow/palette.ts` | create | `MeadowPalette` type |
| `src/world/meadow/sky.ts` | create | Gradient dome, sun disc, stars |
| `src/world/meadow/ground.ts` | create | Hills and mountain ring |
| `src/world/meadow/grass.ts` | create | Instanced blades with a wind shader |
| `src/world/meadow/trees.ts` | create | `createTree(spec, materials)`, the seam for CC0 models |
| `src/world/meadow/clouds.ts` | create | Drifting clouds |
| `src/world/meadow/fireflies.ts` | create | Dusk fireflies |
| `src/world/meadow/meadow.ts` | create | `buildMeadow(tier)` |
| `src/world/meadow/scene.test.ts` | create | Smoke tests for the three.js modules (they run in node, no WebGL) |
| `src/world/theme.ts` | modify | Day and dusk `MeadowPalette` presets |
| `src/world/theme.test.ts` | create | Preset hex check and sync with the CSS fallback |
| `src/world/stand-in.ts` | modify | `STAND_IN` colour and glow constants |
| `src/world/main.ts` | rewrite | Fixed camera, meadow, tier check; Hosts dormant |
| `src/components/World.astro` | modify | Drop `stage:step`, `goTo` and `initialStep` |
| `src/components/Stage.astro` | modify | Comment only |
| `src/styles/theme.css` | modify | Fallback tokens |
| `src/world/fit.ts` | modify | Import `Vec3` from `meadow/layout` |
| `src/world/characters/*.ts` | modify | Host positions move into the clearing |
| `src/world/characters/cast.test.ts` | modify | "Stands in the clearing" |
| `town.ts`, `buildings.ts`, `terrain.ts`, `camera-path.ts`, `load-order.ts` (+ tests), `src/lib/voxel/` | delete | Replaced |
| `docs/adr/0004-threejs-homepage-world.md`, `CONTEXT.md` | modify | Docs |

---

### Task 1: Scene layout (`layout.ts`)

**Files:**
- Create: `src/world/meadow/layout.ts`
- Test: `src/world/meadow/layout.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Vec3 = readonly [number, number, number]`
  - `DEG: number`
  - `seeded(seed: number): () => number`
  - `CAMERA: { position: Vec3; target: Vec3 }`
  - `BASE_FOV = 40`, `MAX_FOV = 75`
  - `verticalFov(aspect: number): number`
  - `project(point: Vec3, aspect: number): { x: number; y: number; depth: number }`
  - `HILL_HEIGHT`, `heightAt(x, z): number`, `groundShade(distance): number`
  - `GROUND: { width; depth; centerZ; segmentsX; segmentsZ }`
  - `interface Peak { x; z; height; radius; turn }`, `MOUNTAINS: Peak[]`
  - `interface TreeSpec { x; z; height; seed }`, `TREES: TreeSpec[]`, `TREE_SWAY`, `TREE_SWAY_SECONDS`
  - `CLEARING: { xMin; xMax; zMin; zMax }`, `inClearing(x, z): boolean`
  - `GRASS_AREA: { near; far; spread; margin }`, `interface Blade { x; z; height; turn }`, `grassBlades(count, seed?): Blade[]`
  - `interface CloudSpec { x; y; z; size; seed }`, `CLOUDS`, `CLOUD_SPEED`, `CLOUD_WRAP`, `cloudX(x0, seconds): number`
  - `FIREFLIES: { count; x: [n, n]; y: [n, n]; z: [n, n] }`, `STARS: { count; radius }`, `SKY_RADIUS`, `SUN_DIRECTION: Vec3`

- [ ] **Step 1: Write the failing test**

Create `src/world/meadow/layout.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
	BASE_FOV,
	CAMERA,
	CLEARING,
	CLOUD_SPEED,
	CLOUD_WRAP,
	GRASS_AREA,
	HILL_HEIGHT,
	MAX_FOV,
	SUN_DIRECTION,
	TREES,
	cloudX,
	grassBlades,
	heightAt,
	inClearing,
	project,
	seeded,
	verticalFov,
	type Vec3,
} from './layout';

const WIDE = 16 / 9;

describe('seeded', () => {
	it('repeats for the same seed and stays in [0, 1)', () => {
		const a = seeded(5);
		const b = seeded(5);
		for (let i = 0; i < 100; i++) {
			const value = a();
			expect(value).toBe(b());
			expect(value).toBeGreaterThanOrEqual(0);
			expect(value).toBeLessThan(1);
		}
	});
});

describe('heightAt', () => {
	it('is deterministic, finite and within the hill bounds', () => {
		for (let x = -400; x <= 400; x += 20) {
			for (let z = -440; z <= 40; z += 20) {
				const h = heightAt(x, z);
				expect(Number.isFinite(h)).toBe(true);
				expect(h).toBeGreaterThanOrEqual(0);
				expect(h).toBeLessThanOrEqual(HILL_HEIGHT);
				expect(heightAt(x, z)).toBe(h);
			}
		}
	});

	it('is nearly flat in the clearing', () => {
		const heights: number[] = [];
		for (let x = CLEARING.xMin; x <= CLEARING.xMax; x += 1) {
			for (let z = CLEARING.zMin; z <= CLEARING.zMax; z += 1) heights.push(heightAt(x, z));
		}
		expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(1.6);
	});
});

describe('camera', () => {
	it('sits above the ground', () => {
		const [x, y, z] = CAMERA.position;
		expect(y - heightAt(x, z)).toBeGreaterThan(3);
	});

	it('puts the horizon about 40% up from the bottom at 16:9', () => {
		const { y } = project([0, CAMERA.position[1], -1e5], WIDE);
		expect((y + 1) / 2).toBeCloseTo(0.4, 1);
	});

	it('puts the sun on screen at the left, clear of a 60rem card on a 1440px screen', () => {
		const [cx, cy, cz] = CAMERA.position;
		const [sx, sy, sz] = SUN_DIRECTION;
		const { x, y } = project([cx + sx * 1000, cy + sy * 1000, cz + sz * 1000], WIDE);
		expect(x).toBeGreaterThan(-1);
		expect(x).toBeLessThan(-0.7);
		expect(Math.abs(y)).toBeLessThan(1);
	});
});

describe('verticalFov', () => {
	it('keeps the base field of view on wide screens', () => {
		expect(verticalFov(WIDE)).toBe(BASE_FOV);
		expect(verticalFov(21 / 9)).toBe(BASE_FOV);
	});

	it('widens on narrower screens, up to the cap', () => {
		expect(verticalFov(4 / 3)).toBeGreaterThan(BASE_FOV);
		expect(verticalFov(4 / 3)).toBeLessThan(MAX_FOV);
		expect(verticalFov(390 / 844)).toBe(MAX_FOV);
	});

	it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('stays between the base and the cap for aspect %s', (aspect) => {
		const fov = verticalFov(aspect);
		expect(fov).toBeGreaterThanOrEqual(BASE_FOV);
		expect(fov).toBeLessThanOrEqual(MAX_FOV);
	});
});

describe('trees', () => {
	const base = (t: { x: number; z: number }): Vec3 => [t.x, heightAt(t.x, t.z), t.z];

	it('keep out of the clearing', () => {
		for (const tree of TREES) expect(inClearing(tree.x, tree.z), `${tree.x},${tree.z}`).toBe(false);
	});

	it('frame the card: every foreground tree lands in the left or right third at 16:9', () => {
		const foreground = TREES.filter((tree) => project(base(tree), WIDE).depth < 150);
		expect(foreground.length).toBeGreaterThanOrEqual(4);
		for (const tree of foreground) {
			const { x } = project(base(tree), WIDE);
			expect(Math.abs(x), `${tree.x},${tree.z}`).toBeGreaterThan(1 / 3);
			expect(Math.abs(x), `${tree.x},${tree.z}`).toBeLessThan(1);
		}
	});
});

describe('clearing', () => {
	it('is on screen in the lower left at 16:9', () => {
		for (const x of [CLEARING.xMin, CLEARING.xMax]) {
			for (const z of [CLEARING.zMin, CLEARING.zMax]) {
				const p = project([x, heightAt(x, z), z], WIDE);
				expect(p.x, `${x},${z}`).toBeGreaterThan(-1);
				expect(p.x, `${x},${z}`).toBeLessThan(0);
				expect(p.y, `${x},${z}`).toBeGreaterThan(-1);
				expect(p.y, `${x},${z}`).toBeLessThan(0);
			}
		}
	});

	it('contains its own centre and not the field', () => {
		expect(inClearing((CLEARING.xMin + CLEARING.xMax) / 2, (CLEARING.zMin + CLEARING.zMax) / 2)).toBe(true);
		expect(inClearing(0, -100)).toBe(false);
	});
});

describe('grassBlades', () => {
	const blades = grassBlades(60000);
	const distance = (b: { z: number }) => -b.z;

	it('is deterministic and stays inside the grass area', () => {
		expect(grassBlades(100)).toEqual(grassBlades(100));
		for (const b of blades) {
			expect(distance(b)).toBeGreaterThanOrEqual(GRASS_AREA.near);
			expect(distance(b)).toBeLessThanOrEqual(GRASS_AREA.far);
			expect(Math.abs(b.x)).toBeLessThanOrEqual(GRASS_AREA.spread * distance(b) + GRASS_AREA.margin);
			expect(b.height).toBeGreaterThan(0);
		}
	});

	it('gets sparser with distance (blades per unit area)', () => {
		// Area of the band between distances a and b: ∫ 2(spread·d + margin) dd.
		const area = (a: number, b: number) =>
			GRASS_AREA.spread * (b * b - a * a) + 2 * GRASS_AREA.margin * (b - a);
		const density = (a: number, b: number) =>
			blades.filter((x) => distance(x) >= a && distance(x) < b).length / area(a, b);
		expect(density(14, 30)).toBeGreaterThan(density(100, 170) * 4);
	});

	it('thins evenly: the first 8,000 blades cover all four quadrants', () => {
		const split = Math.sqrt(GRASS_AREA.near * GRASS_AREA.far);
		const quadrants = [0, 0, 0, 0];
		for (const b of blades.slice(0, 8000)) quadrants[(b.x < 0 ? 0 : 1) + (distance(b) < split ? 0 : 2)]++;
		for (const count of quadrants) expect(count).toBeGreaterThan(8000 * 0.15);
	});
});

describe('cloudX', () => {
	it('drifts at CLOUD_SPEED and wraps inside ±CLOUD_WRAP', () => {
		expect(cloudX(0, 0)).toBe(0);
		expect(cloudX(0, 10)).toBeCloseTo(10 * CLOUD_SPEED, 9);
		expect(cloudX(CLOUD_WRAP - 1, 1)).toBeCloseTo(-CLOUD_WRAP + CLOUD_SPEED - 1, 9);
		for (let s = 0; s < 2000; s += 37) {
			const x = cloudX(-300, s);
			expect(x).toBeGreaterThanOrEqual(-CLOUD_WRAP);
			expect(x).toBeLessThan(CLOUD_WRAP);
		}
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/world/meadow/layout.test.ts`
Expected: FAIL, "Failed to resolve import './layout'".

- [ ] **Step 3: Write the implementation**

Create `src/world/meadow/layout.ts`:

```ts
// The meadow as data: every composition number lives here, so the scene can be tuned and tested without three.js.

export type Vec3 = readonly [number, number, number];

export const DEG = Math.PI / 180;

/** A seeded random number generator (mulberry32): the same meadow on every visit. */
export const seeded = (seed: number): (() => number) => {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
};

const smoothstep = (edge0: number, edge1: number, x: number) => {
	const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
	return t * t * (3 - 2 * t);
};

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const normalize = (a: Vec3): Vec3 => {
	const length = Math.hypot(a[0], a[1], a[2]);
	return [a[0] / length, a[1] / length, a[2] / length];
};
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** Low in the grass, looking 4° up across the meadow: the flat horizon sits 40% up a 16:9 screen. */
export const CAMERA: { position: Vec3; target: Vec3 } = { position: [0, 5, 0], target: [0, 12, -100] };

/** Vertical field of view on screens 16:9 or wider. */
export const BASE_FOV = 40;
/** Narrower screens widen the view to keep the side trees, up to this. */
export const MAX_FOV = 75;
const WIDE = 16 / 9;

/** Vertical field of view in degrees: 16:9's horizontal view is kept on narrower screens, capped at MAX_FOV. */
export const verticalFov = (aspect: number): number => {
	if (!(aspect > 0) || aspect >= WIDE) return BASE_FOV;
	const half = Math.atan((Math.tan((BASE_FOV / 2) * DEG) * WIDE) / aspect);
	return Math.min(MAX_FOV, (2 * half) / DEG);
};

/** Where a world point lands on screen through CAMERA: x and y in -1…1 when visible, depth along the view. */
export const project = (point: Vec3, aspect: number): { x: number; y: number; depth: number } => {
	const forward = normalize(sub(CAMERA.target, CAMERA.position));
	const right = normalize(cross(forward, [0, 1, 0]));
	const up = cross(right, forward);
	const v = sub(point, CAMERA.position);
	const depth = dot(v, forward);
	const t = Math.tan((verticalFov(aspect) / 2) * DEG);
	return { x: dot(v, right) / (depth * t * aspect), y: dot(v, up) / (depth * t), depth };
};

/** Tallest hill, world units (a Host is 17). */
export const HILL_HEIGHT = 12;
/** Hill height near the camera, where the meadow is almost flat. */
const NEAR_HILL = 1.5;

/** A smooth 0–1 hill shape. */
const hillShape = (x: number, z: number) =>
	0.5 + 0.3 * Math.sin(0.018 * x + 1.3) * Math.cos(0.022 * z) + 0.2 * Math.sin(0.041 * x - 0.017 * z + 0.7);

/** Ground height at (x, z): gentle near the camera, rolling hills in the distance. */
export const heightAt = (x: number, z: number): number =>
	hillShape(x, z) * (NEAR_HILL + (HILL_HEIGHT - NEAR_HILL) * smoothstep(40, 220, -z));

/** 0 for near ground, 1 for far: blends grassNear into grassFar. */
export const groundShade = (distance: number): number => smoothstep(20, 320, distance);

/** The ground plane: x −420…420, z −440…40. */
export const GROUND = { width: 840, depth: 480, centerZ: -200, segmentsX: 70, segmentsZ: 40 };

export interface Peak {
	x: number;
	z: number;
	height: number;
	radius: number;
	turn: number;
}

const ring = (count: number, distance: number, heights: [number, number], radii: [number, number], rand: () => number): Peak[] =>
	Array.from({ length: count }, (_, i) => {
		const angle = (-70 + (140 * (i + 0.5 * rand())) / count) * DEG;
		return {
			x: Math.sin(angle) * distance,
			z: -Math.cos(angle) * distance,
			height: heights[0] + (heights[1] - heights[0]) * rand(),
			radius: radii[0] + (radii[1] - radii[0]) * rand(),
			turn: rand() * Math.PI,
		};
	});

/** Two rows of peaks along the horizon; fog dissolves them. */
export const MOUNTAINS: Peak[] = (() => {
	const rand = seeded(3);
	return [...ring(12, 430, [80, 150], [60, 90], rand), ...ring(14, 360, [50, 110], [45, 75], rand)];
})();

export interface TreeSpec {
	x: number;
	z: number;
	/** World units, base to canopy top. */
	height: number;
	seed: number;
}

/** Clumps in the left and right thirds (they frame the card), plus two far trees for depth. */
export const TREES: TreeSpec[] = [
	{ x: -35, z: -80, height: 38, seed: 1 },
	{ x: -48, z: -95, height: 44, seed: 2 },
	{ x: -28, z: -100, height: 34, seed: 3 },
	{ x: 32, z: -65, height: 36, seed: 4 },
	{ x: 44, z: -78, height: 42, seed: 5 },
	{ x: 38, z: -92, height: 32, seed: 6 },
	{ x: -70, z: -240, height: 48, seed: 7 },
	{ x: 95, z: -280, height: 52, seed: 8 },
];

/** Canopy rock, radians either way. */
export const TREE_SWAY = 2 * DEG;
export const TREE_SWAY_SECONDS = 5;

/** Kept free of trees in the left foreground, for the Hosts when they return. */
export const CLEARING = { xMin: -14, xMax: -8, zMin: -36, zMax: -24 };

export const inClearing = (x: number, z: number): boolean =>
	x >= CLEARING.xMin && x <= CLEARING.xMax && z >= CLEARING.zMin && z <= CLEARING.zMax;

/**
 * Blades grow from `near` to `far` in front of the camera, within |x| ≤ spread·distance + margin (a little wider
 * than a 16:9 view). Beyond `far` the ground is plain green.
 */
export const GRASS_AREA = { near: 14, far: 170, spread: 0.75, margin: 4 };

export interface Blade {
	x: number;
	z: number;
	/** World units. */
	height: number;
	/** Radians around y. */
	turn: number;
}

/**
 * `count` blades, each placed independently, so any first n of them is an even sample of the field: lowering a
 * tier by drawing fewer instances thins the grass without bald patches. Distance is log-uniform, so blades are
 * dense near the camera and sparse far away.
 */
export const grassBlades = (count: number, seed = 11): Blade[] => {
	const rand = seeded(seed);
	const ratio = GRASS_AREA.far / GRASS_AREA.near;
	return Array.from({ length: count }, () => {
		const distance = GRASS_AREA.near * ratio ** rand();
		const halfWidth = GRASS_AREA.spread * distance + GRASS_AREA.margin;
		return { x: (rand() * 2 - 1) * halfWidth, z: -distance, height: 2.5 + 2.5 * rand(), turn: (rand() - 0.5) * 1.2 };
	});
};

export interface CloudSpec {
	x: number;
	y: number;
	z: number;
	/** Rough puff radius, world units. */
	size: number;
	seed: number;
}

/** In the upper third of the sky. */
export const CLOUDS: CloudSpec[] = [
	{ x: -480, y: 175, z: -490, size: 32, seed: 21 },
	{ x: -260, y: 150, z: -460, size: 28, seed: 22 },
	{ x: -90, y: 185, z: -500, size: 34, seed: 23 },
	{ x: 60, y: 135, z: -440, size: 24, seed: 24 },
	{ x: 210, y: 170, z: -480, size: 30, seed: 25 },
	{ x: 380, y: 150, z: -470, size: 26, seed: 26 },
];

/** World units per second: about 3 minutes to cross the sky. */
export const CLOUD_SPEED = 3;
/** Clouds wrap from +CLOUD_WRAP back to −CLOUD_WRAP, out of sight on both sides. */
export const CLOUD_WRAP = 700;

/** A cloud's x after `seconds`, starting from `x0`, wrapped into [−CLOUD_WRAP, CLOUD_WRAP). */
export const cloudX = (x0: number, seconds: number): number => {
	const span = 2 * CLOUD_WRAP;
	const shifted = (x0 + CLOUD_SPEED * seconds + CLOUD_WRAP) % span;
	return (shifted < 0 ? shifted + span : shifted) - CLOUD_WRAP;
};

/** Dusk fireflies drift inside this box over the near grass. */
export const FIREFLIES = { count: 40, x: [-40, 40] as [number, number], y: [2, 9] as [number, number], z: [-70, -18] as [number, number] };

export const SKY_RADIUS = 900;
export const STARS = { count: 300, radius: 850 };

/** Low on the left, just above the hills. */
export const SUN_DIRECTION: Vec3 = normalize([-0.62, 0.1, -1]);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/world/meadow/layout.test.ts`
Expected: PASS, all tests.

If the horizon, sun, tree or clearing tests fail, a composition number is off. Adjust the constant in `layout.ts`, not the test. The tests encode spec section 1.

- [ ] **Step 5: Commit**

```bash
npm test && npx astro check && npx astro build
git add src/world/meadow/layout.ts src/world/meadow/layout.test.ts
git commit -m "feat(world): meadow layout as pure data"
```

---

### Task 2: Quality tiers (`quality.ts`)

**Files:**
- Create: `src/world/meadow/quality.ts`
- Test: `src/world/meadow/quality.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Tier = 'low' | 'medium' | 'high'`
  - `TIERS: Record<Tier, { blades: number; pixelRatio: number; fps: number }>`
  - `interface DeviceHints { coarsePointer: boolean; cores?: number; memoryGB?: number }`
  - `pickTier(hints: DeviceHints): Tier`
  - `SLOW_FRAME_MS = 22`, `nextTier(tier: Tier, averageMs: number): Tier`
  - `interface FrameMonitor`, `newMonitor(): FrameMonitor`
  - `recordFrame(monitor, ms, nowSeconds): { monitor: FrameMonitor; average: number | null }`
  - `tierOverride(search: string): Tier | null`

- [ ] **Step 1: Write the failing test**

Create `src/world/meadow/quality.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
	SLOW_FRAME_MS,
	TIERS,
	WARMUP_FRAMES,
	newMonitor,
	nextTier,
	pickTier,
	recordFrame,
	tierOverride,
	type DeviceHints,
	type FrameMonitor,
	type Tier,
} from './quality';

describe('TIERS', () => {
	it('matches the spec', () => {
		expect(TIERS).toEqual({
			high: { blades: 60000, pixelRatio: 2, fps: 60 },
			medium: { blades: 25000, pixelRatio: 1.5, fps: 60 },
			low: { blades: 8000, pixelRatio: 1, fps: 30 },
		});
	});
});

describe('pickTier', () => {
	it.each<[DeviceHints, Tier]>([
		[{ coarsePointer: false, cores: 8, memoryGB: 8 }, 'high'],
		[{ coarsePointer: false, cores: 8 }, 'high'], // Safari and Firefox expose no deviceMemory
		[{ coarsePointer: false }, 'high'],
		[{ coarsePointer: true, cores: 8, memoryGB: 6 }, 'medium'],
		[{ coarsePointer: true }, 'medium'],
		[{ coarsePointer: false, cores: 4, memoryGB: 8 }, 'low'],
		[{ coarsePointer: false, cores: 8, memoryGB: 4 }, 'low'],
		[{ coarsePointer: true, cores: 4 }, 'low'],
	])('%o starts at %s', (hints, tier) => {
		expect(pickTier(hints)).toBe(tier);
	});
});

describe('nextTier', () => {
	it('keeps the tier at or under the slow-frame threshold', () => {
		expect(nextTier('high', 16.7)).toBe('high');
		expect(nextTier('high', SLOW_FRAME_MS)).toBe('high');
	});

	it('drops one tier when frames are slow, and stops at low', () => {
		expect(nextTier('high', 30)).toBe('medium');
		expect(nextTier('medium', 30)).toBe('low');
		expect(nextTier('low', 30)).toBe('low');
	});
});

describe('recordFrame', () => {
	/** Feeds frames of `ms` until the window closes; returns the average and how many frames that took. */
	const run = (monitor: FrameMonitor, ms: number, now: number, extra?: (i: number) => number | null) => {
		let m = monitor;
		let t = now;
		for (let i = 0; i < 1000; i++) {
			const sample = extra?.(i) ?? ms;
			t += ms / 1000;
			const result = recordFrame(m, sample, t);
			m = result.monitor;
			if (result.average !== null) return { average: result.average, frames: i + 1, monitor: m, now: t };
		}
		throw new Error('window never closed');
	};

	it('skips the warm-up frames, then averages a 3-second window', () => {
		const { average, frames } = run(newMonitor(), 16, 0);
		expect(average).toBeCloseTo(16, 6);
		expect(frames).toBeGreaterThan(WARMUP_FRAMES + 180);
	});

	it('ignores a frame longer than 250 ms, like the gap after a hidden tab', () => {
		const { average } = run(newMonitor(), 16, 0, (i) => (i === WARMUP_FRAMES + 20 ? 5000 : null));
		expect(average).toBeCloseTo(16, 6);
	});

	it('starts a fresh window after reporting', () => {
		const first = run(newMonitor(), 16, 0);
		const second = run(first.monitor, 30, first.now);
		expect(second.average).toBeCloseTo(30, 6);
	});
});

describe('tierOverride', () => {
	it('reads ?world=low|medium|high and nothing else', () => {
		expect(tierOverride('?world=low')).toBe('low');
		expect(tierOverride('?a=1&world=high')).toBe('high');
		expect(tierOverride('?world=ultra')).toBeNull();
		expect(tierOverride('')).toBeNull();
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/world/meadow/quality.test.ts`
Expected: FAIL, "Failed to resolve import './quality'".

- [ ] **Step 3: Write the implementation**

Create `src/world/meadow/quality.ts`:

```ts
// How much grass a device draws, and when to draw less. Pure logic; main.ts feeds it the device and the frames.

export type Tier = 'low' | 'medium' | 'high';

export const TIERS: Record<Tier, { blades: number; pixelRatio: number; fps: number }> = {
	high: { blades: 60000, pixelRatio: 2, fps: 60 },
	medium: { blades: 25000, pixelRatio: 1.5, fps: 60 },
	low: { blades: 8000, pixelRatio: 1, fps: 30 },
};

export interface DeviceHints {
	/** Phones and tablets. */
	coarsePointer: boolean;
	/** navigator.hardwareConcurrency. */
	cores?: number;
	/** navigator.deviceMemory; Chromium only, so a missing value is not a weak device. */
	memoryGB?: number;
}

/** The starting tier. Missing hints are ignored, never counted against the device. */
export const pickTier = ({ coarsePointer, cores, memoryGB }: DeviceHints): Tier => {
	if ((cores !== undefined && cores <= 4) || (memoryGB !== undefined && memoryGB <= 4)) return 'low';
	return coarsePointer ? 'medium' : 'high';
};

/** Slower than about 45 fps. */
export const SLOW_FRAME_MS = 22;

const LOWER: Record<Tier, Tier> = { high: 'medium', medium: 'low', low: 'low' };

/** One tier lower when the average frame is slow; never higher. */
export const nextTier = (tier: Tier, averageMs: number): Tier => (averageMs > SLOW_FRAME_MS ? LOWER[tier] : tier);

/** Frames ignored while shaders compile and the first models settle. */
export const WARMUP_FRAMES = 30;
export const WINDOW_SECONDS = 3;
/** A longer frame is a pause (hidden tab, GC), not a measure of drawing speed. */
const MAX_SAMPLE_MS = 250;

export interface FrameMonitor {
	frames: number;
	/** Seconds on the caller's clock when the current window opened. */
	start: number;
	total: number;
	count: number;
}

export const newMonitor = (): FrameMonitor => ({ frames: 0, start: 0, total: 0, count: 0 });

/** Feeds one frame: its length in ms and the clock in seconds. Returns the window's average once it closes, then opens a new window. */
export const recordFrame = (monitor: FrameMonitor, ms: number, now: number): { monitor: FrameMonitor; average: number | null } => {
	if (monitor.frames < WARMUP_FRAMES) return { monitor: { ...monitor, frames: monitor.frames + 1, start: now }, average: null };
	const next = ms > MAX_SAMPLE_MS ? monitor : { ...monitor, total: monitor.total + ms, count: monitor.count + 1 };
	if (now - monitor.start < WINDOW_SECONDS) return { monitor: next, average: null };
	const fresh = { frames: monitor.frames, start: now, total: 0, count: 0 };
	return { monitor: fresh, average: next.count > 0 ? next.total / next.count : null };
};

/** `?world=low|medium|high` (dev only; main.ts checks import.meta.env.DEV). */
export const tierOverride = (search: string): Tier | null => {
	const value = new URLSearchParams(search).get('world');
	return value === 'low' || value === 'medium' || value === 'high' ? value : null;
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/world/meadow/quality.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
npm test && npx astro check && npx astro build
git add src/world/meadow/quality.ts src/world/meadow/quality.test.ts
git commit -m "feat(world): grass quality tiers and frame-time monitor"
```

---

### Task 3: Palette type, sky and ground

**Files:**
- Create: `src/world/meadow/palette.ts`, `src/world/meadow/sky.ts`, `src/world/meadow/ground.ts`
- Test: `src/world/meadow/scene.test.ts`

**Interfaces:**
- Consumes (Task 1): `CAMERA`, `SKY_RADIUS`, `STARS`, `SUN_DIRECTION`, `seeded`, `GROUND`, `MOUNTAINS`, `groundShade`, `heightAt`.
- Produces:
  - `interface MeadowPalette` (fields below)
  - `buildSky(): { group: Group; applyTheme(p: MeadowPalette): void }`; its stars `Points` is named `'stars'`
  - `buildGround(): { group: Group; applyTheme(p: MeadowPalette): void }`; its hills `Mesh` is named `'ground'`, its mountains `InstancedMesh` is named `'mountains'`

- [ ] **Step 1: Write the palette type**

Create `src/world/meadow/palette.ts`:

```ts
/** Every colour and light the meadow uses for one theme. src/world/theme.ts holds the day and dusk values. */
export interface MeadowPalette {
	skyTop: string;
	/** Also the CSS fallback's --color-world-sky. */
	skyHorizon: string;
	/** The sun by day, the moon at dusk. */
	sunDisc: string;
	hemiSky: string;
	hemiGround: string;
	hemiIntensity: number;
	/** The directional light from the sun's side. */
	keyLight: string;
	keyIntensity: number;
	/** Also the CSS fallback's --color-world-ground. */
	grassNear: string;
	grassFar: string;
	mountains: string;
	canopy: string;
	trunk: string;
	cloud: string;
	fog: string;
	fogNear: number;
	fogFar: number;
	stars: boolean;
	fireflies: boolean;
}
```

- [ ] **Step 2: Write the failing test**

Create `src/world/meadow/scene.test.ts`:

```ts
import { Color, InstancedMesh, Mesh, type Points } from 'three';
import { describe, expect, it } from 'vitest';
import { MOUNTAINS, heightAt } from './layout';
import type { MeadowPalette } from './palette';
import { buildGround } from './ground';
import { buildSky } from './sky';

const day: MeadowPalette = {
	skyTop: '#6fb8ec',
	skyHorizon: '#dcefff',
	sunDisc: '#fff6d8',
	hemiSky: '#ffffff',
	hemiGround: '#a8d48f',
	hemiIntensity: 1.4,
	keyLight: '#fff1d6',
	keyIntensity: 1.6,
	grassNear: '#6fbf5a',
	grassFar: '#a5d48a',
	mountains: '#8fa9c4',
	canopy: '#4f9a4a',
	trunk: '#7a5a3c',
	cloud: '#ffffff',
	fog: '#dcefff',
	fogNear: 120,
	fogFar: 480,
	stars: false,
	fireflies: false,
};
const dusk: MeadowPalette = { ...day, stars: true, fireflies: true, grassNear: '#2e5a4a' };

describe('buildSky', () => {
	it('shows stars only when the palette asks for them', () => {
		const sky = buildSky();
		const stars = sky.group.getObjectByName('stars') as Points;
		sky.applyTheme(day);
		expect(stars.visible).toBe(false);
		sky.applyTheme(dusk);
		expect(stars.visible).toBe(true);
	});
});

describe('buildGround', () => {
	it('follows heightAt', () => {
		const ground = buildGround().group.getObjectByName('ground') as Mesh;
		const position = ground.geometry.getAttribute('position');
		for (let i = 0; i < position.count; i += 97) {
			expect(position.getY(i)).toBeCloseTo(heightAt(position.getX(i), position.getZ(i)), 5);
		}
	});

	it('colours the ground near the camera with grassNear', () => {
		const built = buildGround();
		built.applyTheme(day);
		const ground = built.group.getObjectByName('ground') as Mesh;
		const position = ground.geometry.getAttribute('position');
		const color = ground.geometry.getAttribute('color');
		let nearest = 0;
		for (let i = 0; i < position.count; i++) {
			if (Math.hypot(position.getX(i), position.getZ(i)) < Math.hypot(position.getX(nearest), position.getZ(nearest))) nearest = i;
		}
		const expected = new Color(day.grassNear);
		expect(color.getX(nearest)).toBeCloseTo(expected.r, 3);
		expect(color.getY(nearest)).toBeCloseTo(expected.g, 3);
		expect(color.getZ(nearest)).toBeCloseTo(expected.b, 3);
	});

	it('places one mountain per peak', () => {
		const mountains = buildGround().group.getObjectByName('mountains') as InstancedMesh;
		expect(mountains.count).toBe(MOUNTAINS.length);
	});
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/world/meadow/scene.test.ts`
Expected: FAIL, "Failed to resolve import './ground'".

- [ ] **Step 4: Write the sky**

Create `src/world/meadow/sky.ts`:

```ts
import {
	BackSide,
	BufferGeometry,
	Color,
	Float32BufferAttribute,
	Group,
	Mesh,
	Points,
	PointsMaterial,
	ShaderMaterial,
	SphereGeometry,
	Vector3,
} from 'three';
import { CAMERA, SKY_RADIUS, STARS, SUN_DIRECTION, seeded } from './layout';
import type { MeadowPalette } from './palette';

const vertexShader = /* glsl */ `
varying vec3 vDirection;
void main() {
	vDirection = position;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const fragmentShader = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uSun;
uniform vec3 uSunDirection;
varying vec3 vDirection;
void main() {
	vec3 direction = normalize(vDirection);
	vec3 colour = mix(uHorizon, uTop, smoothstep(-0.02, 0.5, direction.y));
	float facing = dot(direction, uSunDirection);
	colour += uSun * 0.25 * smoothstep(0.96, 1.0, facing);
	colour = mix(colour, uSun, smoothstep(0.9990, 0.9994, facing));
	gl_FragColor = vec4(colour, 1.0);
	#include <colorspace_fragment>
}`;

export interface Sky {
	group: Group;
	applyTheme: (palette: MeadowPalette) => void;
}

/** A fixed, seeded dome of stars above the haze, so every visit sees the same sky. */
const buildStars = (): Points => {
	const rand = seeded(7);
	const positions: number[] = [];
	for (let i = 0; i < STARS.count; i++) {
		const theta = rand() * Math.PI * 2;
		const y = 0.08 + 0.92 * rand();
		const r = Math.sqrt(1 - y * y);
		positions.push(STARS.radius * r * Math.cos(theta), STARS.radius * y, STARS.radius * r * Math.sin(theta));
	}
	const geometry = new BufferGeometry();
	geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
	const stars = new Points(geometry, new PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, fog: false }));
	stars.name = 'stars';
	return stars;
};

/** The gradient dome with the sun (or moon) disc, centred on the fixed camera. */
export const buildSky = (): Sky => {
	const uniforms = {
		uTop: { value: new Color() },
		uHorizon: { value: new Color() },
		uSun: { value: new Color() },
		uSunDirection: { value: new Vector3(...SUN_DIRECTION) },
	};
	const dome = new Mesh(
		new SphereGeometry(SKY_RADIUS, 32, 16),
		new ShaderMaterial({ uniforms, vertexShader, fragmentShader, side: BackSide, depthWrite: false }),
	);
	dome.renderOrder = -1;
	dome.frustumCulled = false;
	const stars = buildStars();
	const group = new Group();
	group.position.set(...CAMERA.position);
	group.add(dome, stars);
	return {
		group,
		applyTheme: (palette) => {
			uniforms.uTop.value.set(palette.skyTop);
			uniforms.uHorizon.value.set(palette.skyHorizon);
			uniforms.uSun.value.set(palette.sunDisc);
			stars.visible = palette.stars;
		},
	};
};
```

- [ ] **Step 5: Write the ground**

Create `src/world/meadow/ground.ts`:

```ts
import { Color, ConeGeometry, Float32BufferAttribute, Group, InstancedMesh, Mesh, MeshLambertMaterial, Object3D, PlaneGeometry } from 'three';
import { CAMERA, GROUND, MOUNTAINS, groundShade, heightAt } from './layout';
import type { MeadowPalette } from './palette';

export interface Ground {
	group: Group;
	applyTheme: (palette: MeadowPalette) => void;
}

/** Flat-shaded hills from heightAt, and the mountain ring along the horizon. */
export const buildGround = (): Ground => {
	const plane = new PlaneGeometry(GROUND.width, GROUND.depth, GROUND.segmentsX, GROUND.segmentsZ)
		.rotateX(-Math.PI / 2)
		.translate(0, 0, GROUND.centerZ);
	const geometry = plane.toNonIndexed();
	plane.dispose();
	const position = geometry.getAttribute('position');
	// How far toward grassFar each vertex is; fixed, so a theme change only re-mixes colours.
	const shade = new Float32Array(position.count);
	for (let i = 0; i < position.count; i++) {
		const x = position.getX(i);
		const z = position.getZ(i);
		position.setY(i, heightAt(x, z));
		shade[i] = groundShade(Math.hypot(x - CAMERA.position[0], z - CAMERA.position[2]));
	}
	geometry.computeVertexNormals();
	geometry.setAttribute('color', new Float32BufferAttribute(new Float32Array(position.count * 3), 3));
	const ground = new Mesh(geometry, new MeshLambertMaterial({ vertexColors: true, flatShading: true }));
	ground.name = 'ground';

	const mountainMaterial = new MeshLambertMaterial({ flatShading: true });
	const mountains = new InstancedMesh(new ConeGeometry(1, 1, 6).translate(0, 0.5, 0), mountainMaterial, MOUNTAINS.length);
	mountains.name = 'mountains';
	const dummy = new Object3D();
	MOUNTAINS.forEach((peak, i) => {
		dummy.position.set(peak.x, 0, peak.z);
		dummy.rotation.set(0, peak.turn, 0);
		dummy.scale.set(peak.radius, peak.height, peak.radius);
		dummy.updateMatrix();
		mountains.setMatrixAt(i, dummy.matrix);
	});

	const group = new Group();
	group.add(ground, mountains);
	const near = new Color();
	const far = new Color();
	const mixed = new Color();
	return {
		group,
		applyTheme: (palette) => {
			near.set(palette.grassNear);
			far.set(palette.grassFar);
			const color = geometry.getAttribute('color');
			for (let i = 0; i < color.count; i++) {
				mixed.lerpColors(near, far, shade[i]);
				color.setXYZ(i, mixed.r, mixed.g, mixed.b);
			}
			color.needsUpdate = true;
			mountainMaterial.color.set(palette.mountains);
		},
	};
};
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/world/meadow/scene.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
npm test && npx astro check && npx astro build
git add src/world/meadow/palette.ts src/world/meadow/sky.ts src/world/meadow/ground.ts src/world/meadow/scene.test.ts
git commit -m "feat(world): meadow sky, hills and mountains"
```

---

### Task 4: Grass with wind

**Files:**
- Create: `src/world/meadow/grass.ts`
- Modify: `src/world/meadow/scene.test.ts` (add one import line and one `describe` block)

**Interfaces:**
- Consumes (Task 1): `grassBlades`, `heightAt`. (Task 3): `MeadowPalette`.
- Produces: `buildGrass(count: number, time: { value: number }): { mesh: InstancedMesh; setCount(n: number): void; applyTheme(p: MeadowPalette): void }`. The mesh is named `'grass'`.

- [ ] **Step 1: Write the failing test**

In `src/world/meadow/scene.test.ts`, add this import below `import { buildGround } from './ground';`:

```ts
import { buildGrass } from './grass';
```

Change the first line of `scene.test.ts` from:

```ts
import { Color, InstancedMesh, Mesh, type Points } from 'three';
```

to:

```ts
import { Color, InstancedMesh, Matrix4, Mesh, Vector3, type Points } from 'three';
```

Then append this block at the end of the file:

```ts
describe('buildGrass', () => {
	it('draws `count` blades of 5 triangles each, planted on the ground', () => {
		const grass = buildGrass(8000, { value: 0 });
		expect(grass.mesh.count).toBe(8000);
		expect(grass.mesh.geometry.index?.count).toBe(15);
		const matrix = new Matrix4();
		const root = new Vector3();
		for (const i of [0, 1234, 7999]) {
			grass.mesh.getMatrixAt(i, matrix);
			root.setFromMatrixPosition(matrix);
			expect(root.y).toBeCloseTo(heightAt(root.x, root.z), 5);
		}
	});

	it('thins to a lower count but never above the count it was built with', () => {
		const grass = buildGrass(8000, { value: 0 });
		grass.setCount(100);
		expect(grass.mesh.count).toBe(100);
		grass.setCount(60000);
		expect(grass.mesh.count).toBe(8000);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/world/meadow/scene.test.ts`
Expected: FAIL, "Failed to resolve import './grass'".

- [ ] **Step 3: Write the implementation**

Create `src/world/meadow/grass.ts`:

```ts
import { BufferGeometry, DoubleSide, Float32BufferAttribute, InstancedMesh, MeshLambertMaterial, Object3D } from 'three';
import { grassBlades, heightAt } from './layout';
import type { MeadowPalette } from './palette';

export interface Grass {
	mesh: InstancedMesh;
	/** Draws only the first `count` blades (an even sample of the field), never more than were built. */
	setCount: (count: number) => void;
	applyTheme: (palette: MeadowPalette) => void;
}

const BLADE_WIDTH = 0.35;

/** A tapered 3-segment strip, 1 unit tall on y = 0: 7 vertices, 5 triangles. Darker at the base. */
const bladeGeometry = (): BufferGeometry => {
	const positions: number[] = [];
	const colors: number[] = [];
	for (const y of [0, 1 / 3, 2 / 3]) {
		const half = (BLADE_WIDTH / 2) * (1 - y * 0.8);
		const shade = 0.55 + 0.45 * y;
		positions.push(-half, y, 0, half, y, 0);
		colors.push(shade, shade, shade, shade, shade, shade);
	}
	positions.push(0, 1, 0);
	colors.push(1, 1, 1);
	const geometry = new BufferGeometry();
	geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
	geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
	// Lit from above like the ground, so blades and field share one tone.
	geometry.setAttribute('normal', new Float32BufferAttribute(Array.from({ length: 7 }, () => [0, 1, 0]).flat(), 3));
	geometry.setIndex([0, 1, 3, 0, 3, 2, 2, 3, 5, 2, 5, 4, 4, 5, 6]);
	return geometry;
};

/** Bends each blade with a gust that rolls across the field (about every 7 s) plus a small flutter. Bases stay planted. */
const WIND = /* glsl */ `#include <begin_vertex>
	vec3 root = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
	float gust = sin(root.x * 0.035 + root.z * 0.02 - uTime * 0.9);
	float flutter = sin(uTime * 2.3 + root.x * 1.7 + root.z * 1.3) * 0.15;
	float bend = (0.35 + 0.3 * gust + flutter) * position.y * position.y;
	transformed.x += bend;
	transformed.y -= bend * bend * 0.25;`;

/** `count` instanced blades; `time.value` (seconds) drives the wind. */
export const buildGrass = (count: number, time: { value: number }): Grass => {
	const material = new MeshLambertMaterial({ vertexColors: true, side: DoubleSide });
	material.onBeforeCompile = (shader) => {
		shader.uniforms.uTime = time;
		shader.vertexShader = `uniform float uTime;\n${shader.vertexShader.replace('#include <begin_vertex>', WIND)}`;
	};
	const mesh = new InstancedMesh(bladeGeometry(), material, count);
	mesh.name = 'grass';
	// The wind moves blades outside the instances' computed bounds; the field is always in view anyway.
	mesh.frustumCulled = false;
	const dummy = new Object3D();
	grassBlades(count).forEach((blade, i) => {
		dummy.position.set(blade.x, heightAt(blade.x, blade.z), blade.z);
		dummy.rotation.set(0, blade.turn, 0);
		dummy.scale.set(1, blade.height, 1);
		dummy.updateMatrix();
		mesh.setMatrixAt(i, dummy.matrix);
	});
	return {
		mesh,
		setCount: (next) => {
			mesh.count = Math.max(0, Math.min(count, next));
		},
		applyTheme: (palette) => {
			material.color.set(palette.grassNear);
		},
	};
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/world/meadow/scene.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
npm test && npx astro check && npx astro build
git add src/world/meadow/grass.ts src/world/meadow/scene.test.ts
git commit -m "feat(world): instanced meadow grass with a wind shader"
```

---

### Task 5: Trees, clouds and fireflies

**Files:**
- Create: `src/world/meadow/trees.ts`, `src/world/meadow/clouds.ts`, `src/world/meadow/fireflies.ts`
- Modify: `src/world/meadow/scene.test.ts` (imports and three `describe` blocks)

**Interfaces:**
- Consumes (Task 1): `TreeSpec`, `CLOUDS`, `CloudSpec`, `cloudX`, `FIREFLIES`, `seeded`. (Task 3): `MeadowPalette`.
- Produces:
  - `interface TreeMaterials { trunk: Material; canopy: Material }`
  - `createTree(spec: TreeSpec, materials: TreeMaterials): Group`. The tree stands on y = 0 at the origin and is named `'tree'`. **This is the seam for Approach C.**
  - `buildClouds(): { group: Group; update(seconds: number): void; applyTheme(p: MeadowPalette): void }`
  - `buildFireflies(time: { value: number }): Points`, named `'fireflies'`

- [ ] **Step 1: Write the failing test**

In `src/world/meadow/scene.test.ts`, replace the first line with:

```ts
import { Box3, Color, InstancedMesh, Matrix4, Mesh, MeshLambertMaterial, Vector3, type Points } from 'three';
```

Replace the `import { MOUNTAINS, heightAt } from './layout';` line with:

```ts
import { CLOUDS, FIREFLIES, MOUNTAINS, TREES, cloudX, heightAt } from './layout';
```

Add these imports below `import { buildSky } from './sky';`:

```ts
import { buildClouds } from './clouds';
import { buildFireflies } from './fireflies';
import { createTree } from './trees';
```

Append at the end of the file:

```ts
describe('createTree', () => {
	it.each(TREES.map((spec) => [spec.seed, spec] as const))('tree %s stands on y = 0 and is about its spec height', (_, spec) => {
		const materials = { trunk: new MeshLambertMaterial(), canopy: new MeshLambertMaterial() };
		const box = new Box3().setFromObject(createTree(spec, materials));
		expect(box.min.y).toBeGreaterThan(-0.01);
		expect(box.max.y).toBeGreaterThan(spec.height * 0.8);
		expect(box.max.y).toBeLessThan(spec.height * 1.15);
	});
});

describe('buildClouds', () => {
	it('drifts each cloud along cloudX', () => {
		const clouds = buildClouds();
		clouds.update(42);
		clouds.group.children.forEach((cloud, i) => expect(cloud.position.x).toBeCloseTo(cloudX(CLOUDS[i].x, 42), 9));
	});
});

describe('buildFireflies', () => {
	it('makes FIREFLIES.count specks inside the firefly box', () => {
		const fireflies = buildFireflies({ value: 0 });
		const position = fireflies.geometry.getAttribute('position');
		expect(position.count).toBe(FIREFLIES.count);
		for (let i = 0; i < position.count; i++) {
			expect(position.getX(i)).toBeGreaterThanOrEqual(FIREFLIES.x[0]);
			expect(position.getX(i)).toBeLessThanOrEqual(FIREFLIES.x[1]);
			expect(position.getY(i)).toBeGreaterThanOrEqual(FIREFLIES.y[0]);
			expect(position.getY(i)).toBeLessThanOrEqual(FIREFLIES.y[1]);
		}
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/world/meadow/scene.test.ts`
Expected: FAIL, "Failed to resolve import './clouds'".

- [ ] **Step 3: Write the trees**

Create `src/world/meadow/trees.ts`:

```ts
import { CylinderGeometry, Group, IcosahedronGeometry, Mesh, type Material } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { seeded, type TreeSpec } from './layout';

export interface TreeMaterials {
	trunk: Material;
	canopy: Material;
}

/**
 * One low-poly tree, `spec.height` tall, standing on y = 0 at the origin. meadow.ts places and sways it as a whole.
 * The seam for CC0 tree models (spec "Later", Approach C): a loader that returns a Group of the same height,
 * standing on y = 0, can replace this function without changing anything else.
 */
export const createTree = (spec: TreeSpec, materials: TreeMaterials): Group => {
	const h = spec.height;
	const rand = seeded(spec.seed);
	const trunk = new Mesh(new CylinderGeometry(0.05 * h, 0.08 * h, 0.45 * h, 6).translate(0, 0.225 * h, 0), materials.trunk);
	const blobs = [0.6, 0.72, 0.82].map((y) => {
		const radius = (0.2 + 0.06 * rand()) * h;
		return new IcosahedronGeometry(radius, 0).translate((rand() - 0.5) * 0.3 * h, y * h, (rand() - 0.5) * 0.3 * h);
	});
	const canopyGeometry = mergeGeometries(blobs);
	for (const blob of blobs) blob.dispose();
	const canopy = new Mesh(canopyGeometry, materials.canopy);
	const tree = new Group();
	tree.name = 'tree';
	tree.add(trunk, canopy);
	return tree;
};
```

Check: the top blob's centre is at 0.82h and its radius is at most 0.26h, so the top is at most 1.08h, under the test's 1.15h. The lowest blob sits at 0.6h with radius at least 0.2h, and the trunk reaches 0.45h, so they overlap.

- [ ] **Step 4: Write the clouds**

Create `src/world/meadow/clouds.ts`:

```ts
import { Group, IcosahedronGeometry, Mesh, MeshLambertMaterial, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CLOUDS, cloudX, seeded, type CloudSpec } from './layout';
import type { MeadowPalette } from './palette';

export interface Clouds {
	group: Group;
	update: (seconds: number) => void;
	applyTheme: (palette: MeadowPalette) => void;
}

/** Four faceted puffs in a row, flattened. */
const cloudGeometry = (spec: CloudSpec): BufferGeometry => {
	const rand = seeded(spec.seed);
	const puffs = [0, 1, 2, 3].map((i) =>
		new IcosahedronGeometry(spec.size * (0.55 + 0.25 * rand()), 0).translate(
			(i - 1.5) * spec.size * 0.7,
			rand() * spec.size * 0.25,
			(rand() - 0.5) * spec.size * 0.4,
		),
	);
	const merged = mergeGeometries(puffs);
	for (const puff of puffs) puff.dispose();
	return merged.scale(1, 0.6, 1);
};

/** Slow clouds in the upper sky. Unfogged, so they read against the gradient at their distance. */
export const buildClouds = (): Clouds => {
	const material = new MeshLambertMaterial({ flatShading: true, fog: false });
	const meshes = CLOUDS.map((spec) => {
		const mesh = new Mesh(cloudGeometry(spec), material);
		mesh.position.set(spec.x, spec.y, spec.z);
		return mesh;
	});
	const group = new Group();
	group.add(...meshes);
	return {
		group,
		update: (seconds) => {
			meshes.forEach((mesh, i) => {
				mesh.position.x = cloudX(CLOUDS[i].x, seconds);
			});
		},
		applyTheme: (palette) => {
			material.color.set(palette.cloud);
			// Lit from the low sun behind them, clouds would go grey; a soft self-glow keeps them bright.
			material.emissive.set(palette.cloud);
			material.emissiveIntensity = 0.35;
		},
	};
};
```

- [ ] **Step 5: Write the fireflies**

Create `src/world/meadow/fireflies.ts`:

```ts
import { AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute, Points, ShaderMaterial } from 'three';
import { FIREFLIES, seeded } from './layout';

const vertexShader = /* glsl */ `
uniform float uTime;
attribute float aPhase;
varying float vGlow;
void main() {
	vec3 p = position;
	p.x += sin(uTime * 0.4 + aPhase * 6.28) * 2.5;
	p.y += sin(uTime * 0.7 + aPhase * 12.0) * 1.2;
	p.z += cos(uTime * 0.3 + aPhase * 9.0) * 2.0;
	vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
	vGlow = 0.55 + 0.45 * sin(uTime * 1.6 + aPhase * 20.0);
	gl_PointSize = 240.0 / -viewPosition.z;
	gl_Position = projectionMatrix * viewPosition;
}`;

const fragmentShader = /* glsl */ `
uniform vec3 uColor;
varying float vGlow;
void main() {
	float d = length(gl_PointCoord - 0.5);
	gl_FragColor = vec4(uColor, smoothstep(0.5, 0.0, d) * vGlow);
	#include <colorspace_fragment>
}`;

const FIREFLY_COLOR = '#f6e27a';

/** Glowing specks that bob over the near grass; meadow.ts shows them at dusk only. `time.value` is seconds. */
export const buildFireflies = (time: { value: number }): Points => {
	const rand = seeded(31);
	const between = ([min, max]: [number, number]) => min + (max - min) * rand();
	const positions: number[] = [];
	const phases: number[] = [];
	for (let i = 0; i < FIREFLIES.count; i++) {
		positions.push(between(FIREFLIES.x), between(FIREFLIES.y), between(FIREFLIES.z));
		phases.push(rand());
	}
	const geometry = new BufferGeometry();
	geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
	geometry.setAttribute('aPhase', new Float32BufferAttribute(phases, 1));
	const material = new ShaderMaterial({
		uniforms: { uTime: time, uColor: { value: new Color(FIREFLY_COLOR) } },
		vertexShader,
		fragmentShader,
		transparent: true,
		depthWrite: false,
		blending: AdditiveBlending,
	});
	const fireflies = new Points(geometry, material);
	fireflies.name = 'fireflies';
	fireflies.frustumCulled = false;
	return fireflies;
};
```

The positions are the rest points; the shader adds up to ±2.5 units of drift. The test checks the rest points stay inside the box.

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/world/meadow/scene.test.ts`
Expected: PASS (6 + 8 tree cases + 1 + 1 = 16 tests).

- [ ] **Step 7: Commit**

```bash
npm test && npx astro check && npx astro build
git add src/world/meadow/trees.ts src/world/meadow/clouds.ts src/world/meadow/fireflies.ts src/world/meadow/scene.test.ts
git commit -m "feat(world): meadow trees, clouds and dusk fireflies"
```

---

### Task 6: Assemble the meadow (`meadow.ts`)

**Files:**
- Create: `src/world/meadow/meadow.ts`
- Modify: `src/world/meadow/scene.test.ts` (one import and one `describe` block)

**Interfaces:**
- Consumes: everything from Tasks 1–5, plus `TIERS` and `Tier` from Task 2.
- Produces:

```ts
export interface Meadow {
	group: Group;
	fog: Fog;
	update: (seconds: number) => void;
	applyTheme: (palette: MeadowPalette) => void;
	setTier: (tier: Tier) => void;
}
export const buildMeadow: (tier: Tier) => Meadow;
```

- [ ] **Step 1: Write the failing test**

In `src/world/meadow/scene.test.ts`, add below `import { createTree } from './trees';`:

```ts
import { buildMeadow } from './meadow';
```

Append at the end of the file:

```ts
describe('buildMeadow', () => {
	it('builds its grass for the tier, and only ever thins it', () => {
		const low = buildMeadow('low');
		const grass = low.group.getObjectByName('grass') as InstancedMesh;
		expect(grass.count).toBe(8000);
		low.setTier('high');
		expect(grass.count).toBe(8000);

		const high = buildMeadow('high');
		const thick = high.group.getObjectByName('grass') as InstancedMesh;
		expect(thick.count).toBe(60000);
		high.setTier('medium');
		expect(thick.count).toBe(25000);
	});

	it('switches the dusk extras and the fog synchronously on applyTheme', () => {
		const meadow = buildMeadow('low');
		const fireflies = meadow.group.getObjectByName('fireflies') as Points;
		const stars = meadow.group.getObjectByName('stars') as Points;
		meadow.applyTheme(dusk);
		expect(fireflies.visible).toBe(true);
		expect(stars.visible).toBe(true);
		meadow.applyTheme(day);
		expect(fireflies.visible).toBe(false);
		expect(stars.visible).toBe(false);
		expect(meadow.fog.color.getHexString()).toBe(new Color(day.fog).getHexString());
		expect(meadow.fog.far).toBe(day.fogFar);
	});

	it('sways the trees as time passes, within ±2°', () => {
		const meadow = buildMeadow('low');
		const tree = meadow.group.getObjectByName('tree');
		meadow.update(0);
		const atStart = tree?.rotation.z ?? Number.NaN;
		meadow.update(1.25);
		expect(tree?.rotation.z).not.toBeCloseTo(atStart, 6);
		expect(Math.abs(tree?.rotation.z ?? 1)).toBeLessThanOrEqual((2 * Math.PI) / 180 + 1e-9);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/world/meadow/scene.test.ts`
Expected: FAIL, "Failed to resolve import './meadow'".

- [ ] **Step 3: Write the implementation**

Create `src/world/meadow/meadow.ts`:

```ts
import { DirectionalLight, Fog, Group, HemisphereLight, MeshLambertMaterial } from 'three';
import { buildClouds } from './clouds';
import { buildFireflies } from './fireflies';
import { buildGrass } from './grass';
import { buildGround } from './ground';
import { CAMERA, SUN_DIRECTION, TREES, TREE_SWAY, TREE_SWAY_SECONDS, heightAt } from './layout';
import type { MeadowPalette } from './palette';
import { TIERS, type Tier } from './quality';
import { buildSky } from './sky';
import { createTree } from './trees';

export interface Meadow {
	group: Group;
	/** Set it as scene.fog; applyTheme recolours it. */
	fog: Fog;
	/** Moves every ambient motion to `seconds` since start. Reduced motion calls it once with 0. */
	update: (seconds: number) => void;
	applyTheme: (palette: MeadowPalette) => void;
	/** Thins the grass to a lower tier's blade count; never above the count it was built with. */
	setTier: (tier: Tier) => void;
}

/** The whole meadow, with grass built for `tier`. main.ts disposes it along with the rest of the scene. */
export const buildMeadow = (tier: Tier): Meadow => {
	const time = { value: 0 };
	const fog = new Fog(0xffffff, 100, 500);
	const hemi = new HemisphereLight();
	const key = new DirectionalLight();
	const [cx, cy, cz] = CAMERA.position;
	const [sx, sy, sz] = SUN_DIRECTION;
	key.position.set(cx + sx * 300, cy + sy * 300, cz + sz * 300);

	const sky = buildSky();
	const ground = buildGround();
	const grass = buildGrass(TIERS[tier].blades, time);
	const trunk = new MeshLambertMaterial({ flatShading: true });
	const canopy = new MeshLambertMaterial({ flatShading: true });
	const trees = TREES.map((spec) => {
		const tree = createTree(spec, { trunk, canopy });
		tree.position.set(spec.x, heightAt(spec.x, spec.z), spec.z);
		return tree;
	});
	const clouds = buildClouds();
	const fireflies = buildFireflies(time);

	const group = new Group();
	group.add(hemi, key, sky.group, ground.group, grass.mesh, ...trees, clouds.group, fireflies);

	return {
		group,
		fog,
		update: (seconds) => {
			time.value = seconds;
			trees.forEach((tree, i) => {
				tree.rotation.z = Math.sin((seconds / TREE_SWAY_SECONDS) * Math.PI * 2 + TREES[i].seed) * TREE_SWAY;
			});
			clouds.update(seconds);
		},
		applyTheme: (palette) => {
			fog.color.set(palette.fog);
			fog.near = palette.fogNear;
			fog.far = palette.fogFar;
			hemi.color.set(palette.hemiSky);
			hemi.groundColor.set(palette.hemiGround);
			hemi.intensity = palette.hemiIntensity;
			key.color.set(palette.keyLight);
			key.intensity = palette.keyIntensity;
			sky.applyTheme(palette);
			ground.applyTheme(palette);
			grass.applyTheme(palette);
			trunk.color.set(palette.trunk);
			canopy.color.set(palette.canopy);
			clouds.applyTheme(palette);
			fireflies.visible = palette.fireflies;
		},
		setTier: (next) => grass.setCount(TIERS[next].blades),
	};
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/world/meadow/scene.test.ts`
Expected: PASS (19 tests).

- [ ] **Step 5: Commit**

```bash
npm test && npx astro check && npx astro build
git add src/world/meadow/meadow.ts src/world/meadow/scene.test.ts
git commit -m "feat(world): assemble the meadow behind buildMeadow(tier)"
```

---

### Task 7: Switch the World to the meadow

This is one coherent switch: the presets, the Stand-in constants, `main.ts`, `World.astro` and the CSS fallback all change together. The old town files stay on disk, unused, until Task 8.

**Files:**
- Modify: `src/world/theme.ts` (replace `WorldPreset` and `PRESETS`; keep `documentTheme`/`watchTheme`)
- Create: `src/world/theme.test.ts`
- Modify: `src/world/stand-in.ts` (add `STAND_IN`)
- Rewrite: `src/world/main.ts`
- Modify: `src/components/World.astro` (script only)
- Modify: `src/components/Stage.astro:1-3` (comment)
- Modify: `src/styles/theme.css` (the three `--color-world-sky` / `--color-world-ground` pairs, at lines 15–16, 47–48 and 65–66)

**Interfaces:**
- Consumes: `buildMeadow`, `Meadow` (Task 6); `TIERS`, `pickTier`, `nextTier`, `newMonitor`, `recordFrame`, `tierOverride`, `Tier` (Task 2); `CAMERA`, `BASE_FOV`, `verticalFov`, `heightAt` (Task 1); `MeadowPalette` (Task 3).
- Produces:
  - `PRESETS: Record<WorldTheme, MeadowPalette>`
  - `STAND_IN: { color: string; glow: Record<'light' | 'dark', number> }`
  - `startWorld(canvas, bubble, { reducedMotion }): Promise<{ stop(): void }>`

- [ ] **Step 1: Write the failing test**

Create `src/world/theme.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PRESETS } from './theme';

const css = readFileSync(fileURLToPath(new URL('../styles/theme.css', import.meta.url)), 'utf8');
/** Every value of a --color-world-* token, in file order: the light :root block, then the two dark blocks. */
const tokens = (name: 'sky' | 'ground') =>
	[...css.matchAll(new RegExp(`--color-world-${name}:\\s*(#[0-9a-fA-F]{6})`, 'g'))].map((match) => match[1].toLowerCase());

describe('PRESETS', () => {
	it.each(Object.entries(PRESETS))('%s colours are 6-digit lowercase hex', (_, preset) => {
		for (const [field, value] of Object.entries(preset)) {
			if (typeof value === 'string') expect(value, field).toMatch(/^#[0-9a-f]{6}$/);
		}
	});

	it('shows the dusk extras only in dark mode', () => {
		expect(PRESETS.light.stars || PRESETS.light.fireflies).toBe(false);
		expect(PRESETS.dark.stars && PRESETS.dark.fireflies).toBe(true);
	});

	it('the CSS fallback gradient matches each preset (light first, then both dark blocks)', () => {
		expect(tokens('sky')).toEqual([PRESETS.light.skyHorizon, PRESETS.dark.skyHorizon, PRESETS.dark.skyHorizon]);
		expect(tokens('ground')).toEqual([PRESETS.light.grassNear, PRESETS.dark.grassNear, PRESETS.dark.grassNear]);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/world/theme.test.ts`
Expected: FAIL. The current presets have no `skyHorizon`, so the CSS test sees `undefined`, and `sea` and the others don't match the new expectations.

- [ ] **Step 3: Replace the presets in `src/world/theme.ts`**

Replace everything from `export interface WorldPreset {` down to the closing `};` of `PRESETS` with the code below. Keep the `import { resolveTheme } ...` line and everything from `const systemDark` onward unchanged.

```ts
import type { MeadowPalette } from './meadow/palette';

export type WorldTheme = 'light' | 'dark';

/** Light mode is day; dark mode is dusk. theme.css copies each skyHorizon and grassNear for the no-WebGL fallback. */
export const PRESETS: Record<WorldTheme, MeadowPalette> = {
	light: {
		skyTop: '#6fb8ec',
		skyHorizon: '#dcefff',
		sunDisc: '#fff6d8',
		hemiSky: '#ffffff',
		hemiGround: '#a8d48f',
		hemiIntensity: 1.4,
		keyLight: '#fff1d6',
		keyIntensity: 1.6,
		grassNear: '#6fbf5a',
		grassFar: '#a5d48a',
		mountains: '#8fa9c4',
		canopy: '#4f9a4a',
		trunk: '#7a5a3c',
		cloud: '#ffffff',
		fog: '#dcefff',
		fogNear: 120,
		fogFar: 480,
		stars: false,
		fireflies: false,
	},
	dark: {
		skyTop: '#1a1d48',
		skyHorizon: '#e09a7e',
		sunDisc: '#f4f1ff',
		hemiSky: '#5a64a8',
		hemiGround: '#1c3a34',
		hemiIntensity: 0.8,
		keyLight: '#ffb38a',
		keyIntensity: 0.7,
		grassNear: '#2e5a4a',
		grassFar: '#4a5f6e',
		mountains: '#5b4a7a',
		canopy: '#244a40',
		trunk: '#3d2e2a',
		cloud: '#b9a3c9',
		fog: '#8e6f95',
		fogNear: 100,
		fogFar: 460,
		stars: true,
		fireflies: true,
	},
};
```

The file's first line, `import { resolveTheme } from '../lib/theme';`, stays above the new `import type` line.

- [ ] **Step 4: Update the CSS fallback tokens**

In `src/styles/theme.css`, replace the light pair (lines 15–16):

```css
    --color-world-sky: #bfe3ff;    /* World fallback gradient (day) */
    --color-world-ground: #9fd99a;
```

with:

```css
    --color-world-sky: #dcefff;    /* World fallback gradient: the day preset's skyHorizon and grassNear */
    --color-world-ground: #6fbf5a;
```

Then replace **both** dark pairs (lines 47–48 and 65–66, which are identical):

```css
        --color-world-sky: #16233a;    /* night */
        --color-world-ground: #1d3a2a;
```

with (keeping each block's own indentation):

```css
        --color-world-sky: #e09a7e;    /* dusk: skyHorizon and grassNear */
        --color-world-ground: #2e5a4a;
```

Run: `grep -n "color-world" src/styles/theme.css` and confirm six lines with the new values.

- [ ] **Step 5: Add the Stand-in constants to `src/world/stand-in.ts`**

Add below the `import` line:

```ts
/** The Stand-in's colour (also its emissive colour). Its glow is a hint by day and soft at dusk. */
export const STAND_IN = { color: '#bff5df', glow: { light: 0.15, dark: 0.6 } } as const;
```

- [ ] **Step 6: Rewrite `src/world/main.ts`**

Replace the whole file with:

```ts
import {
	AnimationMixer,
	CircleGeometry,
	Group,
	LoopOnce,
	Mesh,
	MeshBasicMaterial,
	PerspectiveCamera,
	Points,
	Scene,
	SkinnedMesh,
	Texture,
	WebGLRenderer,
	type AnimationAction,
	type Material,
	type Object3D,
} from 'three';
import type { CastMember } from './cast';
import { hosts } from './characters';
import { loadCharacter, type LoadedCharacter } from './load-character';
import { BASE_FOV, CAMERA, heightAt, verticalFov } from './meadow/layout';
import { buildMeadow } from './meadow/meadow';
import { TIERS, newMonitor, nextTier, pickTier, recordFrame, tierOverride, type Tier } from './meadow/quality';
import { motionPose } from './motion';
import { createSpeech, hopHeight } from './speech';
import { STAND_IN, createStandIn, createStandInMaterial } from './stand-in';
import { PRESETS, documentTheme, watchTheme, type WorldTheme } from './theme';

export interface WorldOptions {
	reducedMotion: boolean;
}

export interface WorldController {
	/** Frees every GPU resource and listener. */
	stop: () => void;
}

interface Rig {
	mixer: AnimationMixer;
	idle: AnimationAction;
	talk: AnimationAction | null;
}

interface Actor {
	member: CastMember;
	/** Moved every frame; holds the Stand-in or the model. Speech raycasts target it. */
	slot: Group;
	/** The Stand-in while the slot shows one. */
	standIn: Mesh | null;
	/** The loaded model's animation, once it has swapped in. */
	rig: Rig | null;
	shadow: Mesh;
	seed: number;
	/** Seconds since start when the last hop began. */
	hopStart: number;
}

/** Seconds a clip takes to blend into the next. */
const BLEND_SECONDS = 0.25;
/** Caps one frame's animation step, so a tab that was hidden for a while doesn't jump. */
const MAX_FRAME_SECONDS = 0.1;

/** Cross-fades `from` into `to`. Re-enables `to` first: three.js disables an action once it has faded out to 0. */
const fadeTo = (from: AnimationAction, to: AnimationAction) => {
	to.enabled = true;
	to.setEffectiveTimeScale(1);
	to.setEffectiveWeight(1);
	to.play();
	from.crossFadeTo(to, BLEND_SECONDS, false);
};

/** Frees the geometries, materials, textures and skeletons under `root`. */
const disposeObject = (root: Object3D) =>
	root.traverse((node) => {
		if (node instanceof SkinnedMesh) node.skeleton.dispose();
		if (node instanceof Mesh || node instanceof Points) {
			node.geometry.dispose();
			const materials: Material[] = Array.isArray(node.material) ? node.material : [node.material];
			for (const material of materials) {
				for (const value of Object.values(material)) if (value instanceof Texture) value.dispose();
				material.dispose();
			}
		}
	});

/** What pickTier reads from the browser. deviceMemory is Chromium-only. */
const deviceHints = () => ({
	coarsePointer: window.matchMedia('(pointer: coarse)').matches,
	cores: navigator.hardwareConcurrency || undefined,
	memoryGB: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
});

/** Builds the World into `canvas`: the meadow, seen from one fixed camera. */
export const startWorld = async (
	canvas: HTMLCanvasElement,
	bubble: HTMLElement,
	options: WorldOptions,
): Promise<WorldController> => {
	// `?world=low|medium|high` pins a tier while developing; the frame check then only logs.
	const forced = import.meta.env.DEV ? tierOverride(location.search) : null;
	let tier: Tier = forced ?? pickTier(deviceHints());

	const renderer = new WebGLRenderer({ canvas, antialias: true });
	const applyPixelRatio = () => renderer.setPixelRatio(Math.min(window.devicePixelRatio, TIERS[tier].pixelRatio));
	applyPixelRatio();

	const scene = new Scene();
	const meadow = buildMeadow(tier);
	scene.fog = meadow.fog;
	scene.add(meadow.group);
	const camera = new PerspectiveCamera(BASE_FOV, 1, 1, 1000);
	camera.position.set(...CAMERA.position);
	camera.lookAt(...CAMERA.target);

	const shadowGeometry = new CircleGeometry(1, 20);
	const shadowMaterial = new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false });
	const standInMaterial = createStandInMaterial();
	const actors: Actor[] = hosts.map((member, index) => {
		const slot = new Group();
		const standIn = createStandIn(member.height, standInMaterial);
		slot.add(standIn);
		const shadow = new Mesh(shadowGeometry, shadowMaterial);
		shadow.rotation.x = -Math.PI / 2;
		shadow.scale.setScalar(Math.min(10, member.height * 0.3));
		scene.add(slot, shadow);
		return { member, slot, standIn, rig: null, shadow, seed: index * 1.7, hopStart: -Infinity };
	});

	const applyTheme = (theme: WorldTheme) => {
		meadow.applyTheme(PRESETS[theme]);
		standInMaterial.color.set(STAND_IN.color);
		standInMaterial.emissive.set(STAND_IN.color);
		standInMaterial.emissiveIntensity = STAND_IN.glow[theme];
	};

	const resize = () => {
		const { innerWidth: w, innerHeight: h } = window;
		renderer.setSize(w, h, false);
		camera.aspect = w / h;
		camera.fov = verticalFov(camera.aspect);
		camera.updateProjectionMatrix();
	};

	const start = performance.now();
	const seconds = () => (performance.now() - start) / 1000;

	const place = (actor: Actor, t: number) => {
		const [x, z] = actor.member.position;
		const pose = motionPose(actor.member.motion, options.reducedMotion ? 0 : t, options.reducedMotion ? 0 : actor.seed);
		const ground = heightAt(x, z);
		const hop = options.reducedMotion ? 0 : hopHeight(t - actor.hopStart);
		actor.slot.position.set(x, ground + pose.dy + hop, z);
		actor.slot.rotation.set(0, actor.member.facing, pose.sway);
		actor.shadow.position.set(x, ground + 0.05, z);
	};

	const speech = createSpeech({
		camera,
		bubble,
		targets: actors.map(({ member, slot }) => ({ member, object: slot })),
		onPick: (id) => {
			const actor = actors.find((a) => a.member.id === id);
			if (actor && !options.reducedMotion) {
				const talk = actor.rig?.talk;
				// A running talk has already faded idle out; fading it in again from weight 0 would show the bind pose.
				if (actor.rig && talk) {
					if (talk.isRunning()) talk.reset();
					else fadeTo(actor.rig.idle, talk.reset());
				} else actor.hopStart = seconds();
			}
			if (options.reducedMotion) render();
		},
	});
	const render = () => {
		renderer.render(scene, camera);
		speech.update();
	};

	/** Replaces an actor's Stand-in with its loaded model and starts the idle clip. */
	const swapIn = (actor: Actor, { object, clips }: LoadedCharacter) => {
		if (actor.standIn) {
			actor.slot.remove(actor.standIn);
			actor.standIn.geometry.dispose(); // the material is shared with the other Stand-ins
			actor.standIn = null;
		}
		actor.slot.add(object);
		const mixer = new AnimationMixer(object);
		const idle = mixer.clipAction(clips.idle).play();
		// Offset per Host so they don't breathe in step; reduced motion holds frame 0 as the standing pose.
		idle.time = options.reducedMotion || clips.idle.duration <= 0 ? 0 : (actor.seed * 0.37) % clips.idle.duration;
		const talk = clips.talk ? mixer.clipAction(clips.talk) : null;
		if (talk) {
			talk.setLoop(LoopOnce, 1);
			talk.clampWhenFinished = true;
			mixer.addEventListener('finished', (event) => {
				if (event.action === talk) fadeTo(talk, idle);
			});
		}
		mixer.update(0);
		actor.rig = { mixer, idle, talk };
		if (options.reducedMotion) render();
	};

	let stopped = false;
	/** Loads models one at a time, in cast order; a failure keeps that Stand-in and moves on. */
	const loadModels = async () => {
		for (const actor of actors) {
			const { source } = actor.member;
			if (!source) continue;
			try {
				const loaded = await loadCharacter(source, actor.member.height);
				if (stopped) {
					disposeObject(loaded.object);
					return;
				}
				swapIn(actor, loaded);
			} catch (error) {
				if (stopped) return;
				console.warn('[world] model failed', actor.member.id, error);
			}
		}
	};

	const setTier = (next: Tier) => {
		tier = next;
		meadow.setTier(next);
		applyPixelRatio();
		resize();
	};

	let frame = 0;
	let lastDrawn = start;
	let monitor = newMonitor();
	let measuring = true;
	const tick = (now: number) => {
		frame = requestAnimationFrame(tick);
		if (document.hidden) {
			monitor = newMonitor(); // a hidden tab's gap is a pause, not a slow frame
			return;
		}
		const gap = now - lastDrawn;
		if (gap < 1000 / TIERS[tier].fps - 1) return; // the low tier draws at 30 fps
		lastDrawn = now;
		const t = (now - start) / 1000;
		if (measuring) {
			const result = recordFrame(monitor, gap, t);
			monitor = result.monitor;
			if (result.average !== null) {
				if (import.meta.env.DEV) console.info(`[world] tier=${tier} avg=${result.average.toFixed(1)}ms`);
				const next = forced ?? nextTier(tier, result.average);
				if (next !== tier) {
					setTier(next);
					monitor = newMonitor();
				} else measuring = false;
			}
		}
		meadow.update(t);
		const delta = Math.min(MAX_FRAME_SECONDS, Math.max(0, gap / 1000));
		for (const actor of actors) {
			place(actor, t);
			actor.rig?.mixer.update(delta);
		}
		render();
	};

	resize();
	applyTheme(documentTheme());
	meadow.update(0);
	for (const actor of actors) place(actor, 0);

	const stopTheme = watchTheme((theme) => {
		applyTheme(theme);
		if (options.reducedMotion) render();
	});
	const onResize = () => {
		resize();
		if (options.reducedMotion) render();
	};
	window.addEventListener('resize', onResize);

	if (options.reducedMotion) render();
	else frame = requestAnimationFrame(tick);
	canvas.classList.add('ready');
	performance.mark('world:start');
	void loadModels();

	return {
		stop: () => {
			stopped = true;
			for (const actor of actors) actor.rig?.mixer.stopAllAction();
			cancelAnimationFrame(frame);
			window.removeEventListener('resize', onResize);
			stopTheme();
			speech.dispose();
			disposeObject(scene);
			standInMaterial.dispose(); // not in the scene once every Stand-in has been swapped out
			renderer.dispose();
			renderer.forceContextLoss();
			canvas.classList.remove('ready');
			performance.mark('world:stop');
		},
	};
};
```

- [ ] **Step 7: Simplify the `World.astro` script**

In `src/components/World.astro`, replace the whole `<script>…</script>` block with:

```astro
<script>
	import type { WorldController } from "../world/main";

	let world: WorldController | null = null;

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
				const started = await startWorld(canvas, bubble, { reducedMotion });
				// Navigated away while the World was building: stop it at once.
				if (!canvas.isConnected) return started.stop();
				world = started;
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

Leave the markup and `<style>` unchanged.

- [ ] **Step 8: Update the `Stage.astro` comment**

In `src/components/Stage.astro`, replace the line:

```
// and announces it with a `stage:step` event (World.astro moves the camera on it).
```

with:

```
// and announces it with a `stage:step` event (nothing listens since the World's camera became fixed).
```

- [ ] **Step 9: Run everything**

Run: `npm test`
Expected: PASS, including `src/world/theme.test.ts`. The old `terrain`, `camera-path` and `buildings` tests still pass, because those files still exist.

Run: `npx astro check`
Expected: 0 errors. If `import.meta.env` is untyped in `main.ts`, confirm that `src/env.d.ts` (or `tsconfig.json` `types`) includes `astro/client`, and report it rather than silencing it.

Run: `npx astro build`
Expected: Complete.

- [ ] **Step 10: Quick look in the dev server**

Run `astro dev stop; astro dev --background`. The restart is needed because the config and imports changed, and a stale dev server serves 504 "Outdated Optimize Dep" errors. Then take a screenshot of `http://localhost:4321/?world=high` with the headless script from Task 10, Step 1, or open it in a browser. You should see a sky, hills, grass and trees, with no console errors. Tuning comes in Task 10.

- [ ] **Step 11: Commit**

```bash
git add src/world/theme.ts src/world/theme.test.ts src/world/stand-in.ts src/world/main.ts src/components/World.astro src/components/Stage.astro src/styles/theme.css
git commit -m "feat(world): fixed-camera meadow replaces the voxel town"
```

---

### Task 8: Delete the town and retarget the Hosts

**Files:**
- Delete: `src/world/town.ts`, `src/world/buildings.ts`, `src/world/buildings.test.ts`, `src/world/terrain.ts`, `src/world/terrain.test.ts`, `src/world/camera-path.ts`, `src/world/camera-path.test.ts`, `src/world/load-order.ts`, `src/world/load-order.test.ts`, `src/lib/voxel/` (all files)
- Modify: `src/world/fit.ts:1`
- Modify: `src/world/characters/minh.ts`, `phoenix.ts`, `joker.ts`, `isabelle.ts`, `reshiram.ts` (the `position` line only)
- Modify: `src/world/characters/cast.test.ts`

**Interfaces:**
- Consumes: `CLEARING`, `inClearing`, `Vec3` (Task 1).
- Produces: nothing new.

- [ ] **Step 1: Write the failing test**

In `src/world/characters/cast.test.ts`, replace the import block:

```ts
import { STEPS } from '../../stage/steps';
import { FRAMINGS } from '../camera-path';
import { isLand } from '../terrain';
import { cast, hosts, showHosts } from './index';
```

with:

```ts
import { inClearing } from '../meadow/layout';
import { cast, hosts, showHosts } from './index';
```

Delete the whole test `it('lists the Hosts first, in Step order', () => { … });`.

Replace the test titled `'%s has a name, lines and a height, and stands on land'` with:

```ts
	it.each(cast.map((m) => [m.id, m] as const))('%s has a name, lines and a height, and stands in the clearing', (_, member) => {
		expect(member.name.trim()).not.toBe('');
		expect(member.lines.length).toBeGreaterThan(0);
		expect(member.height).toBeGreaterThan(0);
		const [x, z] = member.position;
		expect(inClearing(x, z), `${member.id} at ${x},${z}`).toBe(true);
	});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/world/characters/cast.test.ts`
Expected: FAIL. Five "stands in the clearing" cases fail, because every Host is still at its town position.

- [ ] **Step 3: Move the Hosts into the clearing**

Change only the `position:` line in each file:

| File | New line |
|---|---|
| `src/world/characters/minh.ts` | `position: [-11, -27],` |
| `src/world/characters/phoenix.ts` | `position: [-9, -31],` |
| `src/world/characters/joker.ts` | `position: [-13, -34],` |
| `src/world/characters/isabelle.ts` | `position: [-10, -25],` |
| `src/world/characters/reshiram.ts` | `position: [-12, -30],` |

They will overlap if `showHosts` is turned on. That is expected: the spec's "Later" section leaves real placement to when the Hosts return.

- [ ] **Step 4: Point `fit.ts` at the new `Vec3`**

In `src/world/fit.ts`, replace line 1:

```ts
import type { Vec3 } from './camera-path';
```

with:

```ts
import type { Vec3 } from './meadow/layout';
```

- [ ] **Step 5: Delete the replaced code**

```bash
git rm -q src/world/town.ts src/world/buildings.ts src/world/buildings.test.ts src/world/terrain.ts src/world/terrain.test.ts src/world/camera-path.ts src/world/camera-path.test.ts src/world/load-order.ts src/world/load-order.test.ts
git rm -rq src/lib/voxel
grep -rn "camera-path\|terrain'\|/town'\|buildings'\|load-order\|lib/voxel" src || echo "no stale imports"
```

Expected: `no stale imports`.

- [ ] **Step 6: Run everything**

Run: `npm test && npx astro check && npx astro build`
Expected: all pass. The test count drops, because the town, camera-path, voxel and load-order suites are gone.

- [ ] **Step 7: Commit**

```bash
git add -A src/world src/lib
git commit -m "refactor(world): delete the voxel town and camera path; Hosts wait in the clearing"
```

---

### Task 9: Docs

**Files:**
- Modify: `docs/adr/0004-threejs-homepage-world.md` (append)
- Modify: `CONTEXT.md` (World, Host, Voxel Model and the style paragraph)

- [ ] **Step 1: Append to ADR 0004**

Add at the end of `docs/adr/0004-threejs-homepage-world.md`:

```markdown

**Update (2026-10-19):** The voxel town and the camera path are gone. The World is now a procedural low-poly meadow, seen from one fixed camera (`docs/superpowers/specs/2026-10-19-meadow-world-design.md`). The owner found the town blocky, flat and busy behind the cards, and the camera moving between Steps distracting. Everything is generated in code from `src/world/meadow/layout.ts`, with no model files, so the download stays small and every composition number can be tuned and unit tested. The ambient motion (grass, trees, clouds, dusk fireflies) runs in vertex shaders from one time value. Grass is the main cost, so it has three quality tiers (60,000 / 25,000 / 8,000 blades). The starting tier comes from device hints, and drops at runtime when frames run slower than about 45 fps. Later options: CC0 stylised props can replace the procedural trees through `createTree`, and a meadow built in Blender and exported as one GLB is possible if more art control is worth a bigger download.
```

- [ ] **Step 2: Update `CONTEXT.md`**

Replace the World entry's body line:

```
The full-screen 3D voxel town rendered behind the homepage content; the camera glides to each Step's Host as the Stage advances, and it switches between day and night with the theme. Purely decorative: nothing essential lives only in the World.
```

with:

```
The full-screen 3D meadow rendered behind the homepage content from one fixed camera, with swaying grass and trees and drifting clouds; it switches between day and dusk with the theme. Purely decorative: nothing essential lives only in the World.
```

Replace the Host entry's body line:

```
The Cast Member the camera frames for a Step: Minh (Hello), Phoenix Wright (Work Experience), Joker (Projects), Isabelle (Blog), Reshiram (Contact).
```

with:

```
The Cast Member paired with a Step: Minh (Hello), Phoenix Wright (Work Experience), Joker (Projects), Isabelle (Blog), Reshiram (Contact). Parked behind `showHosts` until after co-op applications; when they return they stand in the meadow's clearing.
```

Delete the whole **Voxel Model** entry: its heading line, its body line and its `_Avoid_` line.

In the style paragraph, replace `dark mode is a forest-night version of the same.` with `dark mode is a dusk version of the same.`

- [ ] **Step 3: Commit**

```bash
grep -n -i "voxel\|camera glides\|forest-night" CONTEXT.md || echo "CONTEXT clean"
git add docs/adr/0004-threejs-homepage-world.md CONTEXT.md
git commit -m "docs: ADR 0004 and CONTEXT for the meadow World"
```

---

### Task 10: Visual and performance check, tuning, owner check

**Files:**
- Scratchpad only (not committed): `<scratchpad>/pw/meadow-shots.mjs`
- Possibly modify (tuning): `src/world/meadow/layout.ts`, `src/world/theme.ts`, `src/styles/theme.css`, `src/world/meadow/quality.ts`

- [ ] **Step 1: Write the screenshot script**

Playwright is already installed in the session scratchpad at `<scratchpad>/pw` (`npm i playwright@1.56.1` if it isn't). It uses the installed Google Chrome (`channel: 'chrome'`), because Playwright's bundled Chromium is not downloaded. Create `<scratchpad>/pw/meadow-shots.mjs`:

```js
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:4321';
const browser = await chromium.launch({ channel: 'chrome' });
const cases = [
	{ name: 'day-desktop', scheme: 'light', viewport: { width: 1440, height: 900 } },
	{ name: 'dusk-desktop', scheme: 'dark', viewport: { width: 1440, height: 900 } },
	{ name: 'day-phone', scheme: 'light', viewport: { width: 390, height: 844 } },
	{ name: 'dusk-phone', scheme: 'dark', viewport: { width: 390, height: 844 } },
	{ name: 'still-desktop', scheme: 'light', viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' },
];
for (const c of cases) {
	const page = await browser.newPage({ viewport: c.viewport, colorScheme: c.scheme, reducedMotion: c.reducedMotion ?? 'no-preference' });
	page.on('pageerror', (e) => console.log(c.name, 'pageerror', e.message));
	page.on('console', (m) => {
		if (m.type() === 'error' || m.text().startsWith('[world]')) console.log(c.name, m.type(), m.text());
	});
	await page.goto(`${base}/?world=high`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(3000);
	await page.screenshot({ path: `meadow-${c.name}.png` });
	await page.goto(`${base}/#work`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(2500);
	await page.screenshot({ path: `meadow-${c.name}-work.png` });
	await page.close();
}
for (const tier of ['low', 'medium', 'high']) {
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
	page.on('console', (m) => m.text().startsWith('[world]') && console.log('forced', tier, m.text()));
	await page.goto(`${base}/?world=${tier}`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(7000);
	await page.close();
}
await browser.close();
```

Headless Chrome renders WebGL in software (SwiftShader), so its frame times are much slower than a real GPU's. They only show that the measurement and logging work. Only the owner's real-browser check (Step 6) sets the blade counts. The `#work` screenshot is taken without `?world=high`, so in headless it may already have dropped to a lower tier. That's fine, because it is checking the card over the scene, not the grass density.

- [ ] **Step 2: Run it against the dev server**

```bash
astro dev status || astro dev --background
cd <scratchpad>/pw && node meadow-shots.mjs
```

Expected:
- 10 PNGs.
- No `pageerror` lines.
- A `forced <tier> [world] tier=<tier> avg=…ms` line for each of the three tiers.

- [ ] **Step 3: Review the screenshots against the spec**

Open each PNG with the Read tool and check:
- The horizon is about 40% up on desktop.
- The sun is on the left and not glaring behind the card's left edge.
- The trees are in the left and right thirds beside the card.
- The clearing is empty.
- The grass is dense along the bottom.
- The mountains fade into the haze.
- The clouds sit in the upper third.
- Dusk has stars, fireflies and a warm horizon.
- On the phone screenshots, the trees and horizon are still in shot.
- The reduced-motion shot is a still image of the full scene.
- The glass card text looks unaffected.

- [ ] **Step 4: Tune, if needed, and keep the tests green**

Adjust only data: the numbers in `layout.ts` and the colours in `theme.ts`.
- If you change `skyHorizon` or `grassNear`, update the matching tokens in `theme.css`. `src/world/theme.test.ts` enforces this.
- If you move a tree, the clearing or the sun, `layout.test.ts` must still pass. Those tests encode the spec's composition, so change the data to satisfy them. Never loosen a test.
- Re-run Step 2 after each round of tuning.

Then:

```bash
npm test && npx astro check && npx astro build
git add src/world/meadow/layout.ts src/world/theme.ts src/styles/theme.css
git commit -m "tune(world): meadow composition and palettes from the screenshot pass"
```

Skip the commit if nothing changed.

- [ ] **Step 5: Check the bundle size**

```bash
npx astro build >/dev/null && gzip -c dist/_astro/main.*.js | wc -c
```

Expected: at most **190,140** bytes (the baseline of 169,660 plus 20 KB). Report the number either way. If it's over, report it to the owner before going further. Don't strip features to fit without asking.

- [ ] **Step 6: Owner check on a real old laptop (stop here and ask)**

Ask the owner to open these URLs on their oldest laptop, in a normal browser window, with the console open:
- `http://<dev-machine>:4321/?world=low`
- `http://<dev-machine>:4321/?world=medium`
- `http://<dev-machine>:4321/?world=high`

Run `astro dev --background --host` if the laptop is another machine. For each URL, the owner reports the `[world] tier=… avg=…ms` line and whether the grass looks right. If a tier's average is above 22 ms on that laptop, lower that tier's `blades` in `TIERS` (`quality.ts`). Update the `TIERS` expectation in `quality.test.ts` to match, because the owner's measurement now defines the spec values. Then run the checks and commit:

```bash
npm test && npx astro check && npx astro build
git add src/world/meadow/quality.ts src/world/meadow/quality.test.ts
git commit -m "tune(world): grass tier counts from the owner's laptop check"
```

- [ ] **Step 7: Report**

Tell the owner:
- the commits made
- the bundle size against the baseline
- the forced-tier log lines from headless Chrome and from their laptop
- any tuning done
- that nothing is pushed yet

Push only when the owner asks.
