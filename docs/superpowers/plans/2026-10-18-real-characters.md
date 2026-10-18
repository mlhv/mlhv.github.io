# Real Characters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the seven voxel Cast Members with the five Hosts, each shown as a neutral Stand-in until its community glTF model is committed. Load those models one at a time, play their idle and talk clips, and add an `add-model` script that optimises a downloaded model into `public/models/<id>.glb` under a 1.5 MB budget.

**Architecture:**
- **Slots.** Each Host gets a fixed `Group` slot that the render loop moves. The slot starts with a Stand-in capsule.
- **Load queue.** Models with a `source` load one at a time, in an order computed by a pure `loadOrder`, through `loadCharacter`. `loadCharacter` uses `GLTFLoader` with `MeshoptDecoder`, scales the model with a pure `fitToHeight`, and finds its clips.
- **Swap and animate.** A successful load replaces the Stand-in and starts an `AnimationMixer`. A failed load keeps the Stand-in.
- **The script.** `npm run add-model` uses gltf-transform to prune, deduplicate, convert textures to WebP and meshopt-compress a model, and rejects any model that breaks the rules.

**Tech Stack:** Astro 7, TypeScript, three.js 0.186 (`GLTFLoader`, `MeshoptDecoder` and `AnimationMixer`, all inside the existing dynamic import on `/`), Vitest 4. The script also uses Node 25 running `.ts` directly, plus these dev dependencies: `@gltf-transform/core|functions|extensions` 4.x, `meshoptimizer` and `sharp`.

**Spec:** `docs/superpowers/specs/2026-10-18-real-characters-design.md`

## Global Constraints

- No UI framework (ADR 0001). three.js and its addons only through the existing dynamic `import("../world/main")` in `World.astro` (ADR 0004). Never import `three` from a page's frontmatter or a component script. `src/world/characters/*`, `cast.ts`, `credits.ts` and `motion.ts` must stay free of `three` imports, because `index.astro` imports them at build time.
- Model licences: CC0, CC BY or CC BY-SA only. Never game rips. Only optimised files are committed, at most 1.5 MB each (`MAX_MODEL_BYTES = 1.5 * 1024 * 1024`).
- Every Cast Member with a `source` has a `credit`, and every one without a `source` has `credit: null`.
- Reduced motion: mixers never advance, models hold frame 0 of their idle clip, and clicking shows a bubble with no talk clip and no hop.
- No WebGL, a failed import, or no JS: the page still fully works. The canvas stays `aria-hidden`, and nothing essential lives only in 3D.
- `src/lib/voxel/*` stays, because the town uses it.
- Gates before every commit that touches code: `npm test`, `npx astro check` (0 errors), `npx astro build`.
- Code style: tabs, single quotes in `.ts`, double quotes in `.astro`. Conventional commits.

## Review Focus

1. **Leaving `/` while a model is still downloading.** The late model is disposed and never added to the scene, and the console shows no errors. *Task 4, Step 6 (manual).*
2. **Toggling the theme after some Stand-ins have been swapped out.** The remaining Stand-ins recolour and nothing throws. The shared Stand-in material is never disposed on a swap; only the capsule geometry is. *Task 4, Step 6 (manual).*
3. **A model arriving with reduced motion on.** It appears in its standing pose (frame 0 of idle) even though no render loop is running. A click shows the bubble with no talk and no hop. *Task 4, Step 6 (manual).*
4. **A model at a wild scale or offset** (the Khronos Fox is about 100 units tall, a Mixamo export may be 0.017 tall, and the origin isn't always at the feet). It ends up exactly the Host's `height`, feet on the ground, centred on its spot. *Task 1 `fit.test.ts`, plus Task 4, Step 6.*
5. **Clicking a Host repeatedly, mid-talk or right after.** It always ends back on its idle loop and never freezes or snaps to a T-pose. That works because `fadeTo` re-enables the idle action. *Task 4, Step 6 (manual).*

---

## File map

| File | Action | Responsibility |
|---|---|---|
| `src/world/fit.ts` + test | create | `fitToHeight`: scale and offset that make a box a given height, grounded and centred |
| `src/world/motion.ts` + test | create | `Motion` (`still` / `soar`) and `motionPose`; replaces `idle.ts` |
| `src/world/idle.ts`, `idle.test.ts` | delete | |
| `src/world/cast.ts` | rewrite | `CharacterSource` (gltf), `Credit`, `CastMember` |
| `src/world/characters/{minh,phoenix,joker,isabelle,reshiram}.ts` | rewrite | Host data, `source: null` |
| `src/world/characters/{gengar,oshawott,humanoid}.ts` | delete | |
| `src/world/characters/index.ts`, `cast.test.ts` | rewrite | five Hosts in Step order; data rules |
| `src/world/stand-in.ts` + test | create | the Stand-in capsule and its shape maths |
| `src/world/theme.ts` | modify | `gengarGlow` → `standIn`, `standInGlow` |
| `src/world/load-character.ts` | rewrite | glTF load, fit, clip lookup |
| `src/world/main.ts` | modify (Tasks 2, 4) | slots, Stand-ins, load queue, mixers, teardown |
| `src/world/credits.ts` + test | create | `creditLines` |
| `src/pages/index.astro` | modify | credit line lists model credits |
| `src/world/load-order.ts` + test | create | `loadOrder` |
| `src/lib/models.ts` + test | create | budget, argument parsing, model checks shared by the script and tests |
| `scripts/add-model.ts` | create | the optimiser CLI |
| `src/world/models.test.ts` | create | committed `.glb`s are in budget and in use |
| `package.json` | modify | `add-model` script, dev dependencies |
| `CONTEXT.md`, `docs/adr/0004…`, `docs/adr/0005…`, `docs/learning/10-real-characters.md` | modify/create | terms, decision, explainer |

---

### Task 1: `fitToHeight` and `motionPose`

**Files:**
- Create: `src/world/fit.ts`, `src/world/fit.test.ts`, `src/world/motion.ts`, `src/world/motion.test.ts`

**Interfaces:**
- Consumes: `Vec3` from `src/world/camera-path.ts` (`readonly [number, number, number]`).
- Produces:
  - `fitToHeight(box: { min: Vec3; max: Vec3 }, height: number): Fit` with `Fit = { scale: number; offset: Vec3 }`. Apply it as `object.scale.setScalar(scale); object.position.set(...offset)`.
  - `type Motion = { kind: 'still' } | { kind: 'soar' }`
  - `interface Pose { dy: number; sway: number }`
  - `motionPose(motion: Motion, t: number, seed: number): Pose`

`idle.ts` stays in place until Task 2 deletes it.

- [ ] **Step 1: Write the failing tests**

`src/world/fit.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Vec3 } from './camera-path';
import { fitToHeight } from './fit';

/** Where a box's corners end up after applying the fit: scale first, then offset. */
const placed = (min: Vec3, max: Vec3, height: number) => {
	const { scale, offset } = fitToHeight({ min, max }, height);
	const at = (v: Vec3) => v.map((c, i) => c * scale + offset[i]);
	return { min: at(min), max: at(max) };
};

describe('fitToHeight', () => {
	it('scales to the height with the feet at y = 0, centred on x and z', () => {
		const { min, max } = placed([-1, 2, -3], [3, 12, 1], 20);
		expect(min[1]).toBeCloseTo(0, 9);
		expect(max[1]).toBeCloseTo(20, 9);
		expect((min[0] + max[0]) / 2).toBeCloseTo(0, 9);
		expect((min[2] + max[2]) / 2).toBeCloseTo(0, 9);
	});

	it('lifts a model whose origin is at its middle', () => {
		const { min, max } = placed([-1, -5, -1], [1, 5, 1], 10);
		expect(min[1]).toBeCloseTo(0, 9);
		expect(max[1]).toBeCloseTo(10, 9);
	});

	it('shrinks a huge model and grows a tiny one', () => {
		expect(placed([-20, 0, -60], [20, 100, 60], 17).max[1]).toBeCloseTo(17, 9);
		expect(placed([-0.004, 0, -0.002], [0.004, 0.017, 0.002], 17).max[1]).toBeCloseTo(17, 9);
	});

	it('keeps scale 1 for a flat model but still grounds and centres it', () => {
		const fit = fitToHeight({ min: [0, 4, 0], max: [2, 4, 2] }, 10);
		expect(fit.scale).toBe(1);
		expect(fit.offset[0]).toBeCloseTo(-1, 9);
		expect(fit.offset[1]).toBeCloseTo(-4, 9);
		expect(fit.offset[2]).toBeCloseTo(-1, 9);
	});

	it('leaves an empty box alone', () => {
		const fit = fitToHeight({ min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }, 10);
		expect(fit.scale).toBe(1);
		expect(fit.offset).toEqual([0, 0, 0]);
	});
});
```

`src/world/motion.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { motionPose } from './motion';

const times = Array.from({ length: 400 }, (_, i) => i * 0.137);

describe('motionPose', () => {
	it('keeps a still Host exactly in place', () => {
		for (const t of times) expect(motionPose({ kind: 'still' }, t, 3)).toEqual({ dy: 0, sway: 0 });
	});

	it('soars within 1.5 units with only a small roll', () => {
		for (const t of times) {
			const { dy, sway } = motionPose({ kind: 'soar' }, t, 2);
			expect(Math.abs(dy)).toBeLessThanOrEqual(1.5);
			expect(Math.abs(sway)).toBeLessThanOrEqual(0.05);
		}
	});

	it('holds still at t = 0 with seed 0 (the reduced-motion pose)', () => {
		expect(motionPose({ kind: 'soar' }, 0, 0)).toEqual({ dy: 0, sway: 0 });
	});

	it('is deterministic', () => {
		expect(motionPose({ kind: 'soar' }, 3.3, 5)).toEqual(motionPose({ kind: 'soar' }, 3.3, 5));
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/world/fit.test.ts src/world/motion.test.ts`
Expected: FAIL, because `./fit` and `./motion` cannot be resolved.

- [ ] **Step 3: Implement**

`src/world/fit.ts`:

```ts
import type { Vec3 } from './camera-path';

export interface Fit {
	scale: number;
	offset: Vec3;
}

/**
 * Uniform scale and offset that make a model's box `height` tall, its bottom at y = 0 and its centre on x = z = 0.
 * Apply as `object.scale.setScalar(scale); object.position.set(...offset)`. A flat box keeps scale 1; an empty box is left alone.
 */
export const fitToHeight = ({ min, max }: { min: Vec3; max: Vec3 }, height: number): Fit => {
	if (![...min, ...max].every(Number.isFinite)) return { scale: 1, offset: [0, 0, 0] };
	const span = max[1] - min[1];
	const scale = span > 0 ? height / span : 1;
	return {
		scale,
		offset: [-((min[0] + max[0]) / 2) * scale, -min[1] * scale, -((min[2] + max[2]) / 2) * scale],
	};
};
```

`src/world/motion.ts`:

```ts
/** How a Cast Member's whole body moves, computed in code; its animation clips play on top. */
export type Motion = { kind: 'still' } | { kind: 'soar' };

export interface Pose {
	/** Height above the ground, world units. */
	dy: number;
	/** Small roll around z, radians. */
	sway: number;
}

/** Body offset at time t (seconds). Pure, so it can be tested and reused for a still frame. */
export const motionPose = (motion: Motion, t: number, seed: number): Pose => {
	switch (motion.kind) {
		case 'still':
			return { dy: 0, sway: 0 };
		case 'soar':
			return { dy: Math.sin(t * 0.6 + seed) * 1.5, sway: Math.sin(t * 0.4 + seed) * 0.05 };
	}
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/world/fit.test.ts src/world/motion.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Gates and commit**

Run `npm test`, `npx astro check`, then `npx astro build`. All must pass.

```bash
git add src/world/fit.ts src/world/fit.test.ts src/world/motion.ts src/world/motion.test.ts
git commit -m "feat: fitToHeight and motionPose for model-based Cast Members"
```

---

### Task 2: Hosts become Stand-ins

This switches the cast to the new data model and drops every voxel character. Afterwards the World shows five translucent capsules where the Hosts stand. Nothing loads models yet.

**Files:**
- Rewrite: `src/world/cast.ts`, `src/world/characters/index.ts`, `src/world/characters/cast.test.ts`, `src/world/characters/{minh,phoenix,joker,isabelle,reshiram}.ts`, `src/world/load-character.ts`, `src/world/main.ts`
- Create: `src/world/stand-in.ts`, `src/world/stand-in.test.ts`
- Modify: `src/world/theme.ts`
- Delete: `src/world/characters/gengar.ts`, `oshawott.ts`, `humanoid.ts`, `src/world/idle.ts`, `src/world/idle.test.ts`

**Interfaces:**
- Consumes: `fitToHeight`, `Motion` and `motionPose` (Task 1).
- Produces:
  - `CharacterSource = { kind: 'gltf'; url: string; clips: { idle: string; talk?: string } }`
  - `Credit = { title: string; author: string; licence: string; url: string }`
  - `CastMember` with fields `id`, `name`, `position`, `facing`, `height`, `source: CharacterSource | null`, `motion`, `credit: Credit | null` and `lines`. All five are exported from `src/world/cast.ts`.
  - `cast: CastMember[]` from `src/world/characters/index.ts`, in Step order.
  - `LoadedCharacter = { object: Object3D; clips: { idle: AnimationClip; talk: AnimationClip | null } }` and `loadCharacter(source: CharacterSource, height: number): Promise<LoadedCharacter>`, both in `src/world/load-character.ts`. `loadCharacter` throws when a named clip is missing.
  - `standInShape(height)`, `createStandInMaterial()` and `createStandIn(height, material)`, in `src/world/stand-in.ts`.
  - `WorldPreset.standIn: string` and `WorldPreset.standInGlow: number`.
  - In `main.ts`: an `Actor` with `slot: Group` and `standIn: Mesh | null`, plus `disposeObject(root)`.

- [ ] **Step 1: Write the failing tests**

`src/world/stand-in.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { standInShape } from './stand-in';

describe('standInShape', () => {
	it.each([1, 17, 50])('fills exactly %s units with its base on the ground', (height) => {
		const { radius, length, centerY } = standInShape(height);
		expect(radius).toBeGreaterThan(0);
		expect(length).toBeGreaterThan(0);
		expect(2 * radius + length).toBeCloseTo(height, 9);
		expect(centerY).toBeCloseTo(height / 2, 9);
	});
});
```

Replace `src/world/characters/cast.test.ts` entirely:

```ts
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { STEPS } from '../../stage/steps';
import { FRAMINGS } from '../camera-path';
import { isLand } from '../terrain';
import { cast } from './index';

const publicFile = (url: string) => fileURLToPath(new URL(`../../../public${url}`, import.meta.url));

describe('cast', () => {
	it('has unique ids', () => {
		const ids = cast.map((m) => m.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('lists the Hosts first, in Step order', () => {
		expect(cast.slice(0, STEPS.length).map((m) => m.id)).toEqual(STEPS.map((s) => FRAMINGS[s.id].castId));
	});

	it.each(cast.map((m) => [m.id, m] as const))('%s has a name, lines and a height, and stands on land', (_, member) => {
		expect(member.name.trim()).not.toBe('');
		expect(member.lines.length).toBeGreaterThan(0);
		expect(member.height).toBeGreaterThan(0);
		const [x, z] = member.position;
		expect(isLand(x, z)).toBe(true);
	});

	it.each(cast.map((m) => [m.id, m] as const))('%s has a credit exactly when it has a model, and the model exists', (_, member) => {
		expect(member.credit !== null).toBe(member.source !== null);
		if (!member.source || !member.credit) return;
		expect(member.source.url).toMatch(/^\/models\/[a-z0-9-]+\.glb$/);
		expect(existsSync(publicFile(member.source.url)), `${member.source.url} is missing`).toBe(true);
		expect(member.source.clips.idle.trim()).not.toBe('');
		for (const field of ['title', 'author', 'licence'] as const) expect(member.credit[field].trim()).not.toBe('');
		expect(member.credit.url).toMatch(/^https:\/\//);
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/world/stand-in.test.ts src/world/characters/cast.test.ts`
Expected: FAIL. `./stand-in` can't be resolved, and `member.height` is undefined.

- [ ] **Step 3: Rewrite the cast data**

`src/world/cast.ts`:

```ts
import type { Motion } from './motion';

/** A Cast Member's optimised model under public/models/, written by `npm run add-model`. */
export type CharacterSource = {
	kind: 'gltf';
	/** e.g. '/models/joker.glb'. */
	url: string;
	/** Animation clip names inside the file. */
	clips: { idle: string; talk?: string };
};

/** The attribution a licensed model requires; listed under the Contact Step. */
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
	/** World units. The Stand-in is this tall, the model is scaled to it, and the shadow is sized from it. */
	height: number;
	/** null until a model is committed: the Cast Member shows a Stand-in. */
	source: CharacterSource | null;
	motion: Motion;
	/** Required exactly when `source` is set. */
	credit: Credit | null;
	lines: readonly string[];
}
```

`src/world/characters/minh.ts`:

```ts
import type { CastMember } from '../cast';

export const minh: CastMember = {
	id: 'minh',
	name: 'Minh',
	position: [-60, 12],
	facing: 0.2,
	height: 17,
	motion: { kind: 'still' },
	source: null,
	credit: null,
	lines: [
		"Hi, I'm Minh! Grab a matcha. I'm looking for a Summer 2027 internship.",
		"Currently building backend, infra, and applied-AI things.",
		'Keep scrolling. Someone big is waiting on the cliff.',
	],
};
```

`src/world/characters/phoenix.ts`:

```ts
import type { CastMember } from '../cast';

export const phoenix: CastMember = {
	id: 'phoenix',
	name: 'Phoenix Wright',
	position: [-34, -8],
	facing: -0.15,
	height: 19,
	motion: { kind: 'still' },
	source: null,
	credit: null,
	lines: ['Objection!', "Hold it! Have you seen Minh's résumé?", 'Take that!'],
};
```

`src/world/characters/joker.ts`:

```ts
import type { CastMember } from '../cast';

export const joker: CastMember = {
	id: 'joker',
	name: 'Joker',
	position: [6, -6],
	facing: 0.3,
	height: 17,
	motion: { kind: 'still' },
	source: null,
	credit: null,
	lines: ['…', "Leblanc's coffee is the best in town.", 'Take your time.'],
};
```

`src/world/characters/isabelle.ts`:

```ts
import type { CastMember } from '../cast';

export const isabelle: CastMember = {
	id: 'isabelle',
	name: 'Isabelle',
	position: [40, -6],
	facing: -0.3,
	height: 15,
	motion: { kind: 'still' },
	source: null,
	credit: null,
	lines: [
		"Good morning! Today's announcement: Minh shipped a new project!",
		'Please enjoy your stay on the island!',
		'Remember to drink some water today!',
	],
};
```

`src/world/characters/reshiram.ts`:

```ts
import type { CastMember } from '../cast';

export const reshiram: CastMember = {
	id: 'reshiram',
	name: 'Reshiram',
	position: [74, -4],
	facing: -0.4,
	height: 50,
	motion: { kind: 'soar' },
	source: null,
	credit: null,
	lines: ['Reshiram!', '*a warm, bright roar*', 'Truth lights the way.'],
};
```

`src/world/characters/index.ts`:

```ts
import type { CastMember } from '../cast';
import { isabelle } from './isabelle';
import { joker } from './joker';
import { minh } from './minh';
import { phoenix } from './phoenix';
import { reshiram } from './reshiram';

/** The Hosts in Step order. Extras, if they return, go after them. */
export const cast: CastMember[] = [minh, phoenix, joker, isabelle, reshiram];
```

The heights come from measuring the voxel figures (17, 22, 17, 18 and 52.5 units tall). They're trimmed slightly for Phoenix's spiky hair, Isabelle's ears and Reshiram's tail, so the `FRAMINGS` shots stay valid.

Delete the old files:

```bash
git rm src/world/characters/gengar.ts src/world/characters/oshawott.ts src/world/characters/humanoid.ts src/world/idle.ts src/world/idle.test.ts
```

- [ ] **Step 4: Stand-in, theme, loader**

`src/world/stand-in.ts`:

```ts
import { CapsuleGeometry, Mesh, MeshStandardMaterial, type Material } from 'three';

/** Capsule dimensions for a Stand-in `height` tall, standing on y = 0. */
export const standInShape = (height: number) => {
	const radius = height * 0.2;
	return { radius, length: height - 2 * radius, centerY: height / 2 };
};

/** One material shared by every Stand-in; main.ts recolours it per theme and disposes it on stop. */
export const createStandInMaterial = () =>
	new MeshStandardMaterial({ transparent: true, opacity: 0.55, roughness: 0.6, depthWrite: false });

/** The neutral capsule a Cast Member shows without a model. Dispose only its geometry: the material is shared. */
export const createStandIn = (height: number, material: Material): Mesh => {
	const { radius, length, centerY } = standInShape(height);
	const mesh = new Mesh(new CapsuleGeometry(radius, length, 6, 16), material);
	mesh.position.y = centerY;
	return mesh;
};
```

`src/world/theme.ts`: in `WorldPreset`, replace

```ts
	/** PointLight intensity on Gengar (0 = off). */
	gengarGlow: number;
```

with

```ts
	/** Stand-in colour (also its emissive colour). */
	standIn: string;
	/** Stand-in emissive intensity: a hint by day, a soft glow at night. */
	standInGlow: number;
```

In `PRESETS.light`, replace `gengarGlow: 0,` with:

```ts
		standIn: '#bff5df',
		standInGlow: 0.15,
```

In `PRESETS.dark`, replace `gengarGlow: 120,` with:

```ts
		standIn: '#bff5df',
		standInGlow: 0.6,
```

`src/world/load-character.ts` (written now so the types compile; `main.ts` starts calling it in Task 4):

```ts
import { AnimationClip, Box3, Group, type Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { CharacterSource } from './cast';
import { fitToHeight } from './fit';

export interface LoadedCharacter {
	object: Object3D;
	clips: { idle: AnimationClip; talk: AnimationClip | null };
}

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

const findClip = (clips: AnimationClip[], name: string, url: string): AnimationClip => {
	const clip = AnimationClip.findByName(clips, name);
	if (!clip) throw new Error(`${url} has no clip "${name}" (has: ${clips.map((c) => c.name).join(', ') || 'none'})`);
	return clip;
};

/**
 * The only place a CharacterSource becomes a 3D object. Scales the model to `height` with its feet at y = 0,
 * centred on its spot, and finds its clips. Throws (so the caller keeps the Stand-in) if the file or a named clip is missing.
 */
export const loadCharacter = async (source: CharacterSource, height: number): Promise<LoadedCharacter> => {
	const gltf = await loader.loadAsync(source.url);
	const clips = {
		idle: findClip(gltf.animations, source.clips.idle, source.url),
		talk: source.clips.talk ? findClip(gltf.animations, source.clips.talk, source.url) : null,
	};
	const model = gltf.scene;
	model.updateMatrixWorld(true);
	const { min, max } = new Box3().setFromObject(model);
	const { scale, offset } = fitToHeight({ min: [min.x, min.y, min.z], max: [max.x, max.y, max.z] }, height);
	model.scale.setScalar(scale);
	model.position.set(...offset);
	const object = new Group();
	object.add(model);
	return { object, clips };
};
```

- [ ] **Step 5: Rewrite `main.ts` for slots and Stand-ins**

Replace `src/world/main.ts` entirely:

```ts
import {
	CircleGeometry,
	Color,
	DirectionalLight,
	Fog,
	Group,
	HemisphereLight,
	Mesh,
	MeshBasicMaterial,
	PerspectiveCamera,
	Points,
	Scene,
	SkinnedMesh,
	Texture,
	WebGLRenderer,
	type Material,
	type Object3D,
} from 'three';
import type { StepId } from '../stage/steps';
import { glideAt, retarget, shotFor, still, type CameraKey, type Glide } from './camera-path';
import type { CastMember } from './cast';
import { cast } from './characters';
import { motionPose } from './motion';
import { createSpeech, hopHeight } from './speech';
import { createStandIn, createStandInMaterial } from './stand-in';
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
	/** Moved every frame; holds the Stand-in or the model. Speech raycasts target it. */
	slot: Group;
	/** The Stand-in while the slot shows one. */
	standIn: Mesh | null;
	shadow: Mesh;
	seed: number;
	/** Seconds since start when the last hop began. */
	hopStart: number;
}

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
	const standInMaterial = createStandInMaterial();
	const actors: Actor[] = cast.map((member, index) => {
		const slot = new Group();
		const standIn = createStandIn(member.height, standInMaterial);
		slot.add(standIn);
		const shadow = new Mesh(shadowGeometry, shadowMaterial);
		shadow.rotation.x = -Math.PI / 2;
		// Capped so Reshiram's shadow doesn't spread past the edge of the cliff.
		shadow.scale.setScalar(Math.min(10, member.height * 0.3));
		scene.add(slot, shadow);
		return { member, slot, standIn, shadow, seed: index * 1.7, hopStart: -Infinity };
	});

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
		standInMaterial.color.set(preset.standIn);
		standInMaterial.emissive.set(preset.standIn);
		standInMaterial.emissiveIntensity = preset.standInGlow;
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
		const [x, z] = actor.member.position;
		const pose = motionPose(actor.member.motion, options.reducedMotion ? 0 : t, options.reducedMotion ? 0 : actor.seed);
		const ground = surfaceY(x, z);
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
		const shot = shotFor(step, camera.aspect);
		if (shot !== glide.to) moveTo(shot);
		else if (options.reducedMotion) render();
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
			disposeObject(scene);
			standInMaterial.dispose(); // not in the scene once every Stand-in has been swapped out
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

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/world`
Expected: PASS, including `camera-path.test.ts`. Its "anchor matches the Host's position" check still holds, since the positions didn't change.

- [ ] **Step 7: Check in the browser**

Run `astro dev --background`, then open `/`:
- five mint capsules stand where Minh, Phoenix, Joker, Isabelle and Reshiram stood, on the cliff in Reshiram's case
- the camera framings still land beside each card
- clicking a capsule opens its bubble and hops it
- toggling the theme turns the capsules from faint to glowing

Stop the server with `astro dev stop`.

- [ ] **Step 8: Gates and commit**

Run `npm test`, `npx astro check` and `npx astro build`.

```bash
git add -A src/world
git commit -m "feat: Hosts become Stand-ins; drop voxel characters and the extras"
```

---

### Task 3: Credits on the Contact Step

**Files:**
- Create: `src/world/credits.ts`, `src/world/credits.test.ts`
- Modify: `src/pages/index.astro` (the `.credit` paragraph near line 115, and the `.credit` CSS near line 232)

**Interfaces:**
- Consumes: `Credit` and `cast` (Task 2).
- Produces: `creditLines(members: readonly { credit: Credit | null }[]): Credit[]`

- [ ] **Step 1: Write the failing test**

`src/world/credits.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Credit } from './cast';
import { creditLines } from './credits';

const credit = (title: string): Credit => ({ title, author: 'Someone', licence: 'CC BY 4.0', url: `https://example.com/${title}` });

describe('creditLines', () => {
	it('is empty while nobody has a model', () => {
		expect(creditLines([{ credit: null }, { credit: null }])).toEqual([]);
	});

	it('lists credits in cast order, skipping members without one', () => {
		const lines = creditLines([{ credit: credit('b') }, { credit: null }, { credit: credit('a') }]);
		expect(lines.map((c) => c.title)).toEqual(['b', 'a']);
	});
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/world/credits.test.ts`
Expected: FAIL, because `./credits` can't be resolved.

- [ ] **Step 3: Implement**

`src/world/credits.ts`:

```ts
import type { Credit } from './cast';

/** The model credits to show, in cast order. Members without a model have no credit and are skipped. */
export const creditLines = (members: readonly { credit: Credit | null }[]): Credit[] =>
	members.flatMap((member) => (member.credit ? [member.credit] : []));
```

In `src/pages/index.astro`, add these to the frontmatter imports (keep them alphabetical by path):

```astro
import { cast } from "../world/characters";
import { creditLines } from "../world/credits";
```

and after `const formatDate = …`:

```astro
const credits = creditLines(cast);
```

Replace the credit paragraph:

```astro
		<p slot="after" class="credit" data-world-solid>
			Characters © Nintendo / Game Freak / The Pokémon Company / Atlus / Capcom. Fan art.
		</p>
```

with:

```astro
		<p slot="after" class="credit" data-world-solid>
			Characters © Nintendo / Game Freak / The Pokémon Company / Atlus / Capcom. Fan art.
			{
				credits.length > 0 && (
					<>
						{" "}Models:{" "}
						{credits.map((credit, index) => (
							<>
								{index > 0 && " · "}
								<a href={credit.url}>{credit.title}</a> by {credit.author} ({credit.licence})
							</>
						))}
					</>
				)
			}
		</p>
```

In the `<style>` block, after the `.credit { … }` rule, add:

```css
	.credit a {
		color: inherit;
	}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/world/credits.test.ts`
Expected: PASS.

- [ ] **Step 5: Gates and commit**

Run `npm test`, `npx astro check` and `npx astro build`. Then check that `dist/index.html` still contains the copyright note and no "Models:" yet:

```bash
grep -c "Fan art." dist/index.html; grep -c "Models:" dist/index.html
```

Expected: `1`, then `0`.

```bash
git add src/world/credits.ts src/world/credits.test.ts src/pages/index.astro
git commit -m "feat: list model credits under the Contact Step"
```

---

### Task 4: Load queue and animation

**Files:**
- Create: `src/world/load-order.ts`, `src/world/load-order.test.ts`
- Modify: `src/world/main.ts`

**Interfaces:**
- Consumes:
  - `CastMember` and `CharacterSource` (Task 2)
  - `loadCharacter(source, height)` and `LoadedCharacter` (Task 2)
  - `FRAMINGS` from `camera-path.ts`, `STEPS` and `StepId` from `../stage/steps`
- Produces:
  - `ModelledMember = CastMember & { source: CharacterSource }`
  - `loadOrder(members: readonly CastMember[], first: StepId): ModelledMember[]`

- [ ] **Step 1: Write the failing test**

`src/world/load-order.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { CastMember } from './cast';
import { loadOrder } from './load-order';

const member = (id: string, modelled = true): CastMember => ({
	id,
	name: id,
	position: [0, 0],
	facing: 0,
	height: 10,
	motion: { kind: 'still' },
	source: modelled ? { kind: 'gltf', url: `/models/${id}.glb`, clips: { idle: 'idle' } } : null,
	credit: null,
	lines: ['hi'],
});

const ids = (members: readonly CastMember[]) => members.map((m) => m.id);
const hosts = ['reshiram', 'joker', 'minh', 'isabelle', 'phoenix'].map((id) => member(id));

describe('loadOrder', () => {
	it('loads the Hosts in Step order from Hello', () => {
		expect(ids(loadOrder(hosts, 'hello'))).toEqual(['minh', 'phoenix', 'joker', 'isabelle', 'reshiram']);
	});

	it('loads the first Step’s Host first when the page opens deeper in', () => {
		expect(ids(loadOrder(hosts, 'projects'))).toEqual(['joker', 'minh', 'phoenix', 'isabelle', 'reshiram']);
	});

	it('skips members without a model', () => {
		expect(ids(loadOrder([member('minh', false), member('joker'), member('phoenix', false)], 'hello'))).toEqual(['joker']);
	});

	it('loads extras after the Hosts, in cast order', () => {
		expect(ids(loadOrder([member('gengar'), member('minh'), member('oshawott')], 'hello'))).toEqual(['minh', 'gengar', 'oshawott']);
	});

	it('is empty when nobody has a model', () => {
		expect(loadOrder([member('minh', false)], 'hello')).toEqual([]);
	});
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/world/load-order.test.ts`
Expected: FAIL, because `./load-order` can't be resolved.

- [ ] **Step 3: Implement `loadOrder`**

`src/world/load-order.ts`:

```ts
import { STEPS, type StepId } from '../stage/steps';
import { FRAMINGS } from './camera-path';
import type { CastMember, CharacterSource } from './cast';

export type ModelledMember = CastMember & { source: CharacterSource };

/**
 * Cast Members with a model, in the order to load them: the first Step's Host, then the other Hosts in Step order,
 * then everyone else in cast order. One at a time, so the next Host is usually ready before it is scrolled to.
 */
export const loadOrder = (members: readonly CastMember[], first: StepId): ModelledMember[] => {
	const hostIds = [FRAMINGS[first].castId, ...STEPS.map((s) => FRAMINGS[s.id].castId)];
	const rank = (m: CastMember) => {
		const index = hostIds.indexOf(m.id);
		return index === -1 ? hostIds.length : index;
	};
	return members
		.filter((m): m is ModelledMember => m.source !== null)
		.map((m, index) => ({ m, index }))
		.sort((a, b) => rank(a.m) - rank(b.m) || a.index - b.index)
		.map(({ m }) => m);
};
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/world/load-order.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Load models and play clips in `main.ts`**

Make these edits to `src/world/main.ts`, as left by Task 2.

**5a. Imports.** Add `AnimationMixer` and `LoopOnce` to the `three` import (keep it alphabetical), and `type AnimationAction` next to `type Material`. Add after `import { cast } from './characters';`:

```ts
import { loadCharacter, type LoadedCharacter } from './load-character';
import { loadOrder } from './load-order';
```

**5b. Rig, constants and fades.** Replace the `Actor` interface with:

```ts
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
```

**5c. Actor creation.** In the `cast.map` return, add `rig: null`:

```ts
		return { member, slot, standIn, rig: null, shadow, seed: index * 1.7, hopStart: -Infinity };
```

**5d. Click reaction.** Replace the `onPick` in `createSpeech({ … })` with:

```ts
		onPick: (id) => {
			const actor = actors.find((a) => a.member.id === id);
			if (actor && !options.reducedMotion) {
				const talk = actor.rig?.talk;
				if (actor.rig && talk) fadeTo(actor.rig.idle, talk.reset());
				else actor.hopStart = seconds();
			}
			if (options.reducedMotion) render();
		},
```

**5e. Swap-in and the load queue.** Insert this directly after the `render` function:

```ts
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
	/** Loads models one at a time; a failure keeps that Stand-in and moves on. */
	const loadModels = async () => {
		for (const member of loadOrder(cast, options.initialStep)) {
			const actor = actors.find((a) => a.member === member);
			if (!actor) continue;
			try {
				const loaded = await loadCharacter(member.source, member.height);
				if (stopped) {
					disposeObject(loaded.object);
					return;
				}
				swapIn(actor, loaded);
			} catch (error) {
				if (stopped) return;
				console.warn('[world] model failed', member.id, error);
			}
		}
	};
```

**5f. Render loop.** Replace the `tick` function and its `let frame = 0;` line with:

```ts
	let frame = 0;
	let last = start;
	const tick = (now: number) => {
		frame = requestAnimationFrame(tick);
		if (document.hidden) return;
		const t = (now - start) / 1000;
		const delta = Math.min(MAX_FRAME_SECONDS, Math.max(0, (now - last) / 1000));
		last = now;
		aimCamera(t);
		for (const actor of actors) {
			place(actor, t);
			actor.rig?.mixer.update(delta);
		}
		render();
	};
```

**5g. Start loading.** After `performance.mark('world:start');`, add:

```ts
	void loadModels();
```

**5h. Teardown.** At the top of `stop: () => {`, add:

```ts
			stopped = true;
			for (const actor of actors) actor.rig?.mixer.stopAllAction();
```

- [ ] **Step 6: Check in the browser with a throwaway model**

The Khronos sample Fox is rigged and has clips named `Survey`, `Walk` and `Run`. It's about 100 units tall with its origin at its feet. It's only used for this check and is never committed.

```bash
mkdir -p "${TMPDIR:-/tmp}/fox"
curl -L -o "${TMPDIR:-/tmp}/fox/Fox.glb" https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Fox/glTF-Binary/Fox.glb
mkdir -p public/models && cp "${TMPDIR:-/tmp}/fox/Fox.glb" public/models/joker.glb
```

Temporarily edit `src/world/characters/joker.ts`:

```ts
	source: { kind: 'gltf', url: '/models/joker.glb', clips: { idle: 'Survey', talk: 'Run' } },
	credit: { title: 'Fox', author: 'PixelMannen, tomkranis', licence: 'CC BY 4.0', url: 'https://github.com/KhronosGroup/glTF-Sample-Assets' },
```

Run `astro dev --background`, then open `/#projects` and check each item:
- [ ] Joker's capsule turns into the Fox, 17 units tall, standing on the ground, and playing `Survey` on a loop.
- [ ] Clicking the Fox plays `Run` once and blends back to `Survey`. Clicking three times quickly still ends on `Survey`, with no T-pose (Review Focus 5).
- [ ] The other four Hosts are still capsules. Toggling the theme recolours them with no console errors (Review Focus 2).
- [ ] The Contact Step's credit reads "… Fan art. Models: Fox by PixelMannen, tomkranis (CC BY 4.0)".
- [ ] With macOS Reduce Motion on, a reload shows the Fox standing still in frame 0 of `Survey`. A click shows a bubble with no run and no hop (Review Focus 3).
- [ ] With DevTools set to "Slow 3G", reload, then click Projects in the nav before the Fox arrives. The console shows no errors (Review Focus 1).
- [ ] Changing the clip to `idle: 'Nope'` gives `[world] model failed joker Error: /models/joker.glb has no clip "Nope" (has: Survey, Walk, Run)`, and Joker stays a capsule.

Then revert everything from this check:

```bash
git checkout src/world/characters/joker.ts && rm public/models/joker.glb && rmdir public/models
astro dev stop
```

- [ ] **Step 7: Gates and commit**

Run `npm test`, `npx astro check` and `npx astro build`.

```bash
git add src/world/load-order.ts src/world/load-order.test.ts src/world/main.ts
git commit -m "feat: load Host models one at a time and play their idle and talk clips"
```

---

### Task 5: `add-model` pipeline and the model budget test

**Files:**
- Create: `src/lib/models.ts`, `src/lib/models.test.ts`, `scripts/add-model.ts`, `src/world/models.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `cast` (Task 2).
- Produces:
  - `MAX_MODEL_BYTES`
  - `formatBytes(bytes: number): string`
  - `AddModelArgs = { input: string; id: string; idle: string; talk: string | null }`
  - `parseAddModelArgs(argv: readonly string[]): AddModelArgs` (throws `Error` with a usage message)
  - `checkModel(model: { skins: number; clips: readonly string[] }, want: { idle: string; talk: string | null }): string | null`

- [ ] **Step 1: Write the failing tests**

`src/lib/models.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { checkModel, formatBytes, MAX_MODEL_BYTES, parseAddModelArgs } from './models';

describe('MAX_MODEL_BYTES', () => {
	it('is 1.5 MB', () => {
		expect(MAX_MODEL_BYTES).toBe(1_572_864);
		expect(formatBytes(MAX_MODEL_BYTES)).toBe('1.50 MB');
	});
});

describe('parseAddModelArgs', () => {
	it('reads the file, id and clips', () => {
		expect(parseAddModelArgs(['~/m/joker.glb', 'joker', '--idle', 'idle', '--talk', 'talk'])).toEqual({
			input: '~/m/joker.glb',
			id: 'joker',
			idle: 'idle',
			talk: 'talk',
		});
	});

	it('makes --talk optional and accepts flags in any order', () => {
		expect(parseAddModelArgs(['--idle', 'Breathing Idle', 'a.glb', 'minh'])).toEqual({ input: 'a.glb', id: 'minh', idle: 'Breathing Idle', talk: null });
	});

	it.each([
		[[], /usage/i],
		[['a.glb', 'joker'], /--idle/],
		[['a.glb', '--idle', 'idle'], /usage/i],
		[['a.glb', 'Joker!', '--idle', 'idle'], /id/],
		[['a.glb', 'joker', '--idle'], /--idle needs a value/],
		[['a.glb', 'joker', '--idle', 'idle', '--speed', '2'], /unknown flag --speed/],
		[['a.glb', 'joker', 'extra', '--idle', 'idle'], /usage/i],
	])('rejects %j', (argv, message) => {
		expect(() => parseAddModelArgs(argv)).toThrow(message);
	});
});

describe('checkModel', () => {
	const want = { idle: 'idle', talk: 'talk' };

	it('accepts a rigged model with both clips', () => {
		expect(checkModel({ skins: 1, clips: ['idle', 'talk', 'walk'] }, want)).toBeNull();
	});

	it('accepts a missing talk clip when none was asked for', () => {
		expect(checkModel({ skins: 1, clips: ['idle'] }, { idle: 'idle', talk: null })).toBeNull();
	});

	it('rejects a model with no rig', () => {
		expect(checkModel({ skins: 0, clips: ['idle', 'talk'] }, want)).toMatch(/no rig/);
	});

	it('rejects a missing clip and lists the ones that exist', () => {
		expect(checkModel({ skins: 1, clips: ['Survey', 'Run'] }, want)).toBe('no clip "idle". Clips in this file: Survey, Run');
		expect(checkModel({ skins: 1, clips: ['idle'] }, want)).toBe('no clip "talk". Clips in this file: idle');
		expect(checkModel({ skins: 1, clips: [] }, want)).toBe('no clip "idle". Clips in this file: none');
	});
});
```

`src/world/models.test.ts`:

```ts
import { existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { formatBytes, MAX_MODEL_BYTES } from '../lib/models';
import { cast } from './characters';

const dir = fileURLToPath(new URL('../../public/models/', import.meta.url));
const files = existsSync(dir) ? readdirSync(dir).filter((name) => !name.startsWith('.')) : [];

describe('public/models', () => {
	it('holds only optimised .glb files within the budget', () => {
		for (const name of files) {
			expect(name, `${name} is not a .glb`).toMatch(/\.glb$/);
			const size = statSync(dir + name).size;
			expect(size, `${name} is ${formatBytes(size)}`).toBeLessThanOrEqual(MAX_MODEL_BYTES);
		}
	});

	it('holds no model that no Cast Member uses', () => {
		for (const name of files) expect(cast.some((m) => m.source?.url === `/models/${name}`), `${name} is unused`).toBe(true);
	});
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/lib/models.test.ts src/world/models.test.ts`
Expected: FAIL, because `./models` and `../lib/models` can't be resolved.

- [ ] **Step 3: Implement `src/lib/models.ts`**

```ts
/** The most an optimised model may weigh: 1.5 MB (MiB). Enforced by add-model and by src/world/models.test.ts. */
export const MAX_MODEL_BYTES = 1.5 * 1024 * 1024;

export const formatBytes = (bytes: number): string => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

export interface AddModelArgs {
	input: string;
	id: string;
	idle: string;
	talk: string | null;
}

const USAGE = 'usage: npm run add-model -- <original.glb> <id> --idle <clip> [--talk <clip>]';

/** Parses `<original.glb> <id> --idle <clip> [--talk <clip>]`, flags in any position. Throws with a usage message. */
export const parseAddModelArgs = (argv: readonly string[]): AddModelArgs => {
	const positional: string[] = [];
	const flags: Record<string, string> = {};
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (!arg.startsWith('--')) {
			positional.push(arg);
			continue;
		}
		const name = arg.slice(2);
		if (name !== 'idle' && name !== 'talk') throw new Error(`unknown flag ${arg}\n${USAGE}`);
		const value = argv[i + 1];
		if (value === undefined || value.startsWith('--')) throw new Error(`${arg} needs a value\n${USAGE}`);
		flags[name] = value;
		i++;
	}
	if (positional.length !== 2) throw new Error(USAGE);
	const [input, id] = positional;
	if (!/^[a-z][a-z0-9-]*$/.test(id)) throw new Error(`id "${id}" must be lowercase letters, digits and dashes (the Cast Member's id)`);
	if (!flags.idle) throw new Error(`--idle <clip> is required\n${USAGE}`);
	return { input, id, idle: flags.idle, talk: flags.talk ?? null };
};

/** Why a model can't be used, or null if it can: it must be rigged and contain the named clips. */
export const checkModel = (
	{ skins, clips }: { skins: number; clips: readonly string[] },
	{ idle, talk }: { idle: string; talk: string | null },
): string | null => {
	if (skins === 0) return 'model has no rig (no skin). Rig it first; Mixamo works for human-shaped characters.';
	for (const name of talk ? [idle, talk] : [idle]) {
		if (!clips.includes(name)) return `no clip "${name}". Clips in this file: ${clips.join(', ') || 'none'}`;
	}
	return null;
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/models.test.ts src/world/models.test.ts`
Expected: PASS. `public/models/` doesn't exist yet, so both `public/models` tests pass with nothing to check.

- [ ] **Step 5: Install the optimiser's dev dependencies and add the script**

```bash
npm install --save-dev @gltf-transform/core@^4.5.1 @gltf-transform/functions@^4.5.1 @gltf-transform/extensions@^4.5.1 meshoptimizer@^1.3.0 sharp@^0.35.5
node -e "import('sharp').then((s) => console.log('sharp ok', typeof s.default))"
```

Expected: `sharp ok function`. If npm reports that it blocked sharp's install script and that check fails, add `"sharp": true` to `allowScripts` in `package.json`, then rerun `npm install`.

In `package.json` `scripts`, add after `"sync-resume"`:

```json
    "add-model": "node scripts/add-model.ts"
```

Remember the comma after the `sync-resume` line.

`scripts/add-model.ts`:

```ts
/**
 * Optimise a downloaded, rigged character model into public/models/<id>.glb.
 *
 *   npm run add-model -- ~/models/joker.glb joker --idle idle [--talk talk]
 *
 * Keeps only the named clips, prunes and deduplicates, resizes textures to at most 1024 px as WebP, and
 * meshopt-compresses the geometry. Refuses a model with no rig, a missing clip, or a result over the budget.
 * Never edits TypeScript: set `source` and `credit` in src/world/characters/<id>.ts afterwards.
 * See "Sourcing and preparing models" in docs/superpowers/specs/2026-10-18-real-characters-design.md.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, textureCompress } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { checkModel, formatBytes, MAX_MODEL_BYTES, parseAddModelArgs } from '../src/lib/models.ts';

const fail = (message: string): never => {
	console.error(`✗ ${message}`);
	process.exit(1);
};

const args = (() => {
	try {
		return parseAddModelArgs(process.argv.slice(2));
	} catch (error) {
		return fail(error instanceof Error ? error.message : String(error));
	}
})();

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO()
	.registerExtensions(ALL_EXTENSIONS)
	.registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

const doc = await io.read(resolve(args.input));
const root = doc.getRoot();
const problem = checkModel(
	{ skins: root.listSkins().length, clips: root.listAnimations().map((animation) => animation.getName()) },
	args,
);
if (problem) fail(problem);

const keep = new Set([args.idle, args.talk]);
for (const animation of root.listAnimations()) if (!keep.has(animation.getName())) animation.dispose();

await doc.transform(
	prune(),
	dedup(),
	textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024] }),
	meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
);

const glb = await io.writeBinary(doc);
if (glb.byteLength > MAX_MODEL_BYTES) {
	fail(`optimised model is ${formatBytes(glb.byteLength)}, over the ${formatBytes(MAX_MODEL_BYTES)} budget. Pick a lighter model or reduce it in Blender (Decimate modifier).`);
}

const out = resolve(import.meta.dirname, '..', 'public', 'models', `${args.id}.glb`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, glb);

console.log(`✓ public/models/${args.id}.glb (${formatBytes(glb.byteLength)})`);
console.log(`  clips: idle "${args.idle}"${args.talk ? `, talk "${args.talk}"` : ''}`);
console.log(`Next: in src/world/characters/${args.id}.ts set`);
console.log(`  source: { kind: 'gltf', url: '/models/${args.id}.glb', clips: { idle: '${args.idle}'${args.talk ? `, talk: '${args.talk}'` : ''} } },`);
console.log(`  credit: { title, author, licence, url },`);
console.log('then run npm test and commit the .glb with that file.');
```

- [ ] **Step 6: Run the script on real files**

Re-download the Fox if Task 4's copy is gone, plus an unrigged box:

```bash
mkdir -p "${TMPDIR:-/tmp}/fox"
curl -L -o "${TMPDIR:-/tmp}/fox/Fox.glb" https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Fox/glTF-Binary/Fox.glb
curl -L -o "${TMPDIR:-/tmp}/fox/Box.glb" https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Box/glTF-Binary/Box.glb
```

Run each and compare with what's expected:

```bash
npm run add-model -- "${TMPDIR:-/tmp}/fox/Box.glb" joker --idle idle
```
Expected: `✗ model has no rig (no skin)…`, exit code 1, nothing written.

```bash
npm run add-model -- "${TMPDIR:-/tmp}/fox/Fox.glb" joker --idle Nope
```
Expected: `✗ no clip "Nope". Clips in this file: Survey, Walk, Run`, exit code 1.

```bash
npm run add-model -- "${TMPDIR:-/tmp}/fox/Fox.glb" joker --idle Survey --talk Run
```
Expected: `✓ public/models/joker.glb (0.xx MB)` and the next-step hints.

```bash
npx vitest run src/world/models.test.ts
```
Expected: FAIL with `joker.glb is unused`. This shows the orphan check works.

Check that the optimised file loads with meshopt and WebP. Temporarily set Joker's `source` and `credit` as in Task 4, Step 6. Then run `astro dev --background`, open `/#projects` and confirm the Fox appears, textured and animated. Then revert:

```bash
git checkout src/world/characters/joker.ts && rm -r public/models
astro dev stop
```

- [ ] **Step 7: Gates and commit**

Run `npm test`, `npx astro check` (this also type-checks `scripts/add-model.ts`) and `npx astro build`.

```bash
git add src/lib/models.ts src/lib/models.test.ts src/world/models.test.ts scripts/add-model.ts package.json package-lock.json
git commit -m "feat: add-model optimiser and the 1.5 MB model budget"
```

---

### Task 6: Docs

**Files:**
- Modify: `CONTEXT.md`, `docs/adr/0004-threejs-homepage-world.md`
- Create: `docs/adr/0005-community-gltf-characters.md`, `docs/learning/10-real-characters.md`

- [ ] **Step 1: `CONTEXT.md`**

Replace the **Cast Member** entry with:

```markdown
**Cast Member**:
A character standing in the World: the owner's stylised avatar or a fan-art game character. It's shown as its community glTF model, or as a Stand-in until that model exists. Clickable for a speech bubble.
_Avoid_: NPC, sprite
```

Add after it:

```markdown
**Stand-in**:
The translucent capsule a Cast Member shows when it has no model yet, while its model loads, or when the model fails to load.
_Avoid_: Placeholder, ghost

**Credit**:
The attribution (title, author, licence, source link) a Cast Member's licensed model requires, listed under the Contact Step.
_Avoid_: Attribution, license (as the entry name)
```

Replace the **Voxel Model** entry with:

```markdown
**Voxel Model**:
A town prop (building, tree, terrain feature) defined as a palette plus text layer grids (or boxes painted into them), turned into a merged mesh at runtime. Cast Members are no longer Voxel Models.
_Avoid_: Asset, 3D model (when referring to these code-authored grids)
```

- [ ] **Step 2: ADRs**

Append to `docs/adr/0004-threejs-homepage-world.md`:

```markdown

**Update (2026-10-18):** Cast Members are no longer voxel grids. They are community glTF models loaded through the same `loadCharacter` seam; see ADR 0005.
```

Create `docs/adr/0005-community-gltf-characters.md`:

```markdown
# Cast Members are community glTF models

The owner wants the Cast Members "as close to the real characters as possible," so the voxel figures are replaced with rigged glTF models. These are community-made fan models under CC0, CC BY or CC BY-SA, plus a VRoid avatar of the owner. Models ripped from the games are never used. They look the most accurate, but the site is public under the owner's name, and many rips are re-uploaded with licences the uploader had no right to give. Each model is optimised once by `npm run add-model` (WebP textures at most 1024 px, meshopt geometry). Only the optimised `.glb` is committed, at most 1.5 MB, and a test enforces that. Originals stay outside the repo.

A Cast Member without a model, or whose model fails to load, shows a neutral Stand-in. The voxel character code is deleted rather than kept as a fallback, because the owner rejected the voxel look and a mismatched fallback would bring it back. Animation comes from clips in the model file through `AnimationMixer`, not from code. Only rigged models qualify.

## Considered options

- **Optimise at build time** with originals in the repo: rejected. Originals are 10–50 MB each and would bloat the repo or need Git LFS.
- **Load from Sketchfab or a CDN at runtime:** rejected. It depends on a third party staying up and keeping its licence terms, and gives no control over compression.
```

- [ ] **Step 3: Learning note**

Create `docs/learning/10-real-characters.md`:

```markdown
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
```

- [ ] **Step 4: Commit**

```bash
git add CONTEXT.md docs/adr/0004-threejs-homepage-world.md docs/adr/0005-community-gltf-characters.md docs/learning/10-real-characters.md
git commit -m "docs: Stand-in and Credit terms, ADR 0005, real characters learning note"
```
