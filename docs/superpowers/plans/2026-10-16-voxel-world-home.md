# Voxel World Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A full-screen, scroll-driven 3D voxel town behind the homepage content, with seven clickable voxel characters (Minh, Joker, Phoenix Wright, Isabelle, Gengar, Oshawott, Reshiram), day/night that follows the theme, and graceful fallbacks.

**Architecture:** Pure TypeScript modules (voxel model parsing, face culling, terrain, camera path, idle poses, line picking) are unit-tested with Vitest and hold all the logic. Thin three.js modules turn that data into merged meshes and drive the render loop. `World.astro` owns the fixed canvas, the CSS gradient fallback and the ClientRouter start/stop lifecycle, and loads three.js only on `/` through a dynamic import.

**Tech Stack:** Astro 7, vanilla TypeScript, three.js `0.186.1` (+ `@types/three` `0.186.0`), Vitest 4. Headless Playwright (scratchpad only, not a project dependency) for browser checks.

**Spec:** `docs/superpowers/specs/2026-10-16-voxel-world-home-design.md`

## Global Constraints

- No UI framework (ADR 0001). three.js is allowed as a rendering library (ADR 0004, written in Task 6).
- Dependencies: `three@^0.186.1`, dev `@types/three@^0.186.0`. No other new runtime dependencies.
- three.js is reached only through `await import("../world/main")` in `World.astro`; no other file in `src/pages`, `src/layouts` or `src/components` imports from `three` or `src/world/main`.
- Pure modules (`src/lib/voxel/model.ts`, `src/lib/voxel/faces.ts`, `src/world/terrain.ts`, `src/world/camera-path.ts`, `src/world/idle.ts`, `src/world/cast.ts`, `src/world/buildings.ts`, `src/world/characters/*.ts`) must not import `three`.
- Every text/background pair meets WCAG AA (≥ 4.5:1 normal text).
- Canvas is `aria-hidden="true"`; nothing essential lives only in the World.
- `prefers-reduced-motion: reduce` → one static render, no camera travel, no idle animation, no hop; bubbles still open.
- No WebGL / import failure / JS disabled → CSS gradient only; page fully works.
- Fan-art credit text, verbatim: `Characters © Nintendo / Game Freak / The Pokémon Company / Atlus / Capcom. Fan art.`
- Code style: tabs, single quotes in `.ts`, double quotes in `.astro`, matching the existing `src/lib` files. Commits use conventional prefixes (`feat:`, `docs:`, `test:`).
- Gates after every task: `npm test`, `npx astro check` (0 errors), `npx astro build`.

## Review Focus

- **Navigating away while the World is still loading:** leaving `/` before the dynamic import or `startWorld` resolves must not leave a running renderer. Expected: the late start is stopped immediately. Pinned in Task 6 (lifecycle `isConnected` guard) and Task 10 (browser round-trip check).
- **Touch scrolling on phones:** a finger drag that starts on a character must scroll, not open a bubble. Expected: bubbles open on `click` (tap), never on `pointerdown`. Pinned in Task 9 (browser check dispatches a bare `pointerdown` and expects no bubble).
- **Homepage shorter than the viewport, or overscroll bounce:** scroll range ≤ 0 or negative `scrollY` must not produce `NaN` or out-of-range camera positions. Expected: progress is 0 and clamped. Pinned in Task 4 (`scrollProgress` tests).
- **Overlapping voxels when props are merged:** duplicate positions (for example a tree touching a building) must not emit duplicate faces, which would z-fight. Expected: one set of faces per position. Pinned in Task 2 (`visibleFaces` dedupe test).
- **A Cast Member standing or wandering into the sea or pond:** expected: every base position, and every sampled wander position, is on land. Pinned in Task 3 (cast validity test), which runs over every character added in Tasks 7–8.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/voxel/model.ts` | `VoxelModel`/`Voxel`/`Box` types; `parseVoxelModel`, `modelFromBoxes`, `offsetVoxels` |
| `src/lib/voxel/faces.ts` | `FACES` table; `visibleFaces` (culling + dedupe) |
| `src/lib/voxel/mesh.ts` | three.js: `buildVoxelGeometry`, `buildVoxelMesh` |
| `src/world/terrain.ts` | Island grid constants; `terrainAt`, `surfaceY`, `isLand` |
| `src/world/idle.ts` | `Idle` union; `idlePose` |
| `src/world/cast.ts` | `CharacterSource`, `CastMember` types |
| `src/world/characters/humanoid.ts` | Shared humanoid body boxes |
| `src/world/characters/<id>.ts` | One Cast Member each |
| `src/world/characters/index.ts` | `cast` array |
| `src/world/load-character.ts` | three.js: `loadCharacter(source)` (upgrade seam) |
| `src/world/camera-path.ts` | `CAMERA_KEYS`, `cameraAt`, `scrollProgress` |
| `src/world/buildings.ts` | Café, courthouse, town hall, tree models and placements |
| `src/world/theme.ts` | `PRESETS`, `documentTheme`, `watchTheme` |
| `src/world/town.ts` | three.js: terrain, props, windows, sea, stars |
| `src/world/speech.ts` | `pickLine`, `hopHeight` (pure) + `createSpeech` (three.js + DOM) |
| `src/world/main.ts` | three.js: `startWorld` renderer, loop, wiring |
| `src/components/World.astro` | Canvas, gradient, bubble element, lifecycle script |
| `src/pages/index.astro` | Mounts `World`, intro card, transparent desktop, runway, credit |
| `src/styles/theme.css` | `--color-world-sky`, `--color-world-ground` tokens |
| `docs/adr/0004-threejs-homepage-world.md` | ADR |
| `CONTEXT.md` | World, Cast Member, Voxel Model; Desktop update |
| `docs/learning/08-voxel-world.md` | Learning explainer |

**Coordinate conventions (used everywhere):** x = right, y = up, z = toward the camera. In a `VoxelModel`, `layers[y][z][x]`, layers go bottom-up, rows go back (z = 0) to front, and the character's front is its largest z. Rotation `y = 0` means a character faces +z (toward the camera). One world unit is one character voxel. Terrain blocks are 4 units (`BLOCK`).

---

### Task 1: Voxel model format

**Files:**
- Modify: `package.json` (dependencies)
- Create: `src/lib/voxel/model.ts`
- Test: `src/lib/voxel/model.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface VoxelModel { palette: Readonly<Record<string, string>>; layers: readonly (readonly string[])[] }`
  - `interface Voxel { x: number; y: number; z: number; color: string }`
  - `type Box = readonly [x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, key: string]` (inclusive bounds)
  - `const EMPTY = '.'`
  - `parseVoxelModel(model: VoxelModel): Voxel[]`
  - `modelFromBoxes(palette: Readonly<Record<string, string>>, boxes: readonly Box[]): VoxelModel`
  - `offsetVoxels(voxels: readonly Voxel[], dx: number, dy: number, dz: number): Voxel[]`

- [ ] **Step 1: Install three.js**

Run: `npm install three@0.186.1 && npm install -D @types/three@0.186.0`
Expected: `package.json` gains `"three": "^0.186.1"` in `dependencies` and `"@types/three": "^0.186.0"` in `devDependencies`.

- [ ] **Step 2: Write the failing tests**

`src/lib/voxel/model.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { modelFromBoxes, offsetVoxels, parseVoxelModel } from './model';

describe('parseVoxelModel', () => {
	it('maps layer → y, row → z, column → x, skipping "." and spaces', () => {
		const voxels = parseVoxelModel({
			palette: { a: '#ff0000', b: '#00ff00' },
			layers: [['a.', ' b'], ['..', '.a']],
		});
		expect(voxels).toEqual([
			{ x: 0, y: 0, z: 0, color: '#ff0000' },
			{ x: 1, y: 0, z: 1, color: '#00ff00' },
			{ x: 1, y: 1, z: 1, color: '#ff0000' },
		]);
	});

	it('accepts rows and layers of uneven length', () => {
		const voxels = parseVoxelModel({ palette: { a: '#000000' }, layers: [['aaa', 'a'], ['a']] });
		expect(voxels).toHaveLength(5);
	});

	it('throws with the location of an unknown palette key', () => {
		expect(() => parseVoxelModel({ palette: { a: '#000000' }, layers: [['a'], ['.z']] })).toThrow(
			'Unknown palette key "z" at layer 1, row 0, column 1',
		);
	});

	it('returns no voxels for an empty model', () => {
		expect(parseVoxelModel({ palette: {}, layers: [] })).toEqual([]);
	});
});

describe('modelFromBoxes', () => {
	const palette = { a: '#111111', b: '#222222' };

	it('fills inclusive boxes', () => {
		const voxels = parseVoxelModel(modelFromBoxes(palette, [[0, 0, 0, 1, 2, 3, 'a']]));
		expect(voxels).toHaveLength(2 * 3 * 4);
	});

	it('lets later boxes overwrite earlier ones and "." carve', () => {
		const model = modelFromBoxes(palette, [
			[0, 0, 0, 2, 0, 0, 'a'],
			[1, 0, 0, 1, 0, 0, 'b'],
			[2, 0, 0, 2, 0, 0, '.'],
		]);
		expect(model.layers).toEqual([['ab']]);
	});

	it('throws on negative or inverted boxes', () => {
		expect(() => modelFromBoxes(palette, [[-1, 0, 0, 0, 0, 0, 'a']])).toThrow('Box 0');
		expect(() => modelFromBoxes(palette, [[2, 0, 0, 1, 0, 0, 'a']])).toThrow('Box 0');
	});

	it('throws on an unknown key', () => {
		expect(() => modelFromBoxes(palette, [[0, 0, 0, 0, 0, 0, 'q']])).toThrow('Box 0 uses unknown palette key "q"');
	});

	it('returns an empty model for no boxes', () => {
		expect(modelFromBoxes(palette, [])).toEqual({ palette, layers: [] });
	});
});

describe('offsetVoxels', () => {
	it('shifts every voxel without mutating the input', () => {
		const input = [{ x: 1, y: 2, z: 3, color: '#000000' }];
		expect(offsetVoxels(input, 10, 20, 30)).toEqual([{ x: 11, y: 22, z: 33, color: '#000000' }]);
		expect(input[0].x).toBe(1);
	});
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/lib/voxel/model.test.ts`
Expected: FAIL, `Failed to resolve import "./model"`.

- [ ] **Step 4: Implement**

`src/lib/voxel/model.ts`:

```ts
/**
 * A Voxel Model: a palette plus text layer grids. `layers[y][z][x]`, layers bottom-up,
 * rows back (z = 0) to front. "." or " " is an empty cell.
 */
export interface VoxelModel {
	palette: Readonly<Record<string, string>>;
	layers: readonly (readonly string[])[];
}

export interface Voxel {
	x: number;
	y: number;
	z: number;
	color: string;
}

/** Inclusive box `[x0, y0, z0, x1, y1, z1, key]`; key "." carves. */
export type Box = readonly [x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, key: string];

export const EMPTY = '.';

const isEmpty = (key: string) => key === EMPTY || key === ' ';

export const parseVoxelModel = (model: VoxelModel): Voxel[] => {
	const voxels: Voxel[] = [];
	model.layers.forEach((rows, y) =>
		rows.forEach((row, z) =>
			[...row].forEach((key, x) => {
				if (isEmpty(key)) return;
				const color = model.palette[key];
				if (!color) throw new Error(`Unknown palette key "${key}" at layer ${y}, row ${z}, column ${x}`);
				voxels.push({ x, y, z, color });
			}),
		),
	);
	return voxels;
};

/** Builds a model by painting boxes in order; later boxes win. Coordinates must be non-negative. */
export const modelFromBoxes = (palette: Readonly<Record<string, string>>, boxes: readonly Box[]): VoxelModel => {
	let width = 0;
	let height = 0;
	let depth = 0;
	boxes.forEach(([x0, y0, z0, x1, y1, z1, key], index) => {
		if (Math.min(x0, y0, z0) < 0 || x1 < x0 || y1 < y0 || z1 < z0) {
			throw new Error(`Box ${index} must have non-negative, non-inverted bounds`);
		}
		if (!isEmpty(key) && !palette[key]) throw new Error(`Box ${index} uses unknown palette key "${key}"`);
		width = Math.max(width, x1 + 1);
		height = Math.max(height, y1 + 1);
		depth = Math.max(depth, z1 + 1);
	});

	const grid = Array.from({ length: height }, () =>
		Array.from({ length: depth }, () => Array.from({ length: width }, () => EMPTY)),
	);
	for (const [x0, y0, z0, x1, y1, z1, key] of boxes) {
		for (let y = y0; y <= y1; y++)
			for (let z = z0; z <= z1; z++)
				for (let x = x0; x <= x1; x++) grid[y][z][x] = isEmpty(key) ? EMPTY : key;
	}
	return { palette, layers: grid.map((rows) => rows.map((row) => row.join(''))) };
};

export const offsetVoxels = (voxels: readonly Voxel[], dx: number, dy: number, dz: number): Voxel[] =>
	voxels.map((voxel) => ({ ...voxel, x: voxel.x + dx, y: voxel.y + dy, z: voxel.z + dz }));
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/voxel/model.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/voxel/model.ts src/lib/voxel/model.test.ts
git commit -m "feat: voxel model format (text layers, boxes, offsets) and three.js dependency"
```

---

### Task 2: Face culling and voxel meshes

**Files:**
- Create: `src/lib/voxel/faces.ts`, `src/lib/voxel/mesh.ts`
- Test: `src/lib/voxel/faces.test.ts`

**Interfaces:**
- Consumes: `Voxel` from Task 1.
- Produces:
  - `FACES: readonly FaceDef[]` (6 entries), `interface FaceDef { dir: Vec3; corners: readonly [Vec3, Vec3, Vec3, Vec3] }`, `type Vec3 = readonly [number, number, number]`
  - `interface VisibleFace { voxel: Voxel; face: number }`
  - `visibleFaces(voxels: readonly Voxel[]): VisibleFace[]`
  - `interface VoxelMeshOptions { scale?: number; center?: boolean }` (defaults `scale = 1`, `center = true`; centering puts the bottom-centre of the bounds at the origin)
  - `buildVoxelGeometry(voxels: readonly Voxel[], options?: VoxelMeshOptions): BufferGeometry`
  - `buildVoxelMesh(voxels: readonly Voxel[], options?: VoxelMeshOptions): Mesh` (`MeshLambertMaterial({ vertexColors: true })`)

- [ ] **Step 1: Write the failing tests**

`src/lib/voxel/faces.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { FACES, visibleFaces } from './faces';

const v = (x: number, y: number, z: number) => ({ x, y, z, color: '#000000' });

describe('visibleFaces', () => {
	it('shows all six faces of a lone voxel', () => {
		expect(visibleFaces([v(0, 0, 0)])).toHaveLength(6);
	});

	it('hides the shared faces of two neighbours', () => {
		expect(visibleFaces([v(0, 0, 0), v(1, 0, 0)])).toHaveLength(10);
	});

	it('shows only the outer shell of a solid 3×3×3 cube', () => {
		const cube = [];
		for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) for (let z = 0; z < 3; z++) cube.push(v(x, y, z));
		expect(visibleFaces(cube)).toHaveLength(9 * 6);
	});

	it('emits faces once for duplicate positions (no z-fighting when props overlap)', () => {
		expect(visibleFaces([v(0, 0, 0), { ...v(0, 0, 0), color: '#ffffff' }])).toHaveLength(6);
	});
});

describe('FACES', () => {
	it('has one unit normal per axis direction', () => {
		const dirs = FACES.map((f) => f.dir.join(','));
		expect(new Set(dirs)).toEqual(new Set(['-1,0,0', '1,0,0', '0,-1,0', '0,1,0', '0,0,-1', '0,0,1']));
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/voxel/faces.test.ts`
Expected: FAIL, `Failed to resolve import "./faces"`.

- [ ] **Step 3: Implement faces**

`src/lib/voxel/faces.ts`:

```ts
import type { Voxel } from './model';

export type Vec3 = readonly [number, number, number];

export interface FaceDef {
	dir: Vec3;
	/** Unit-cube corners; triangles are (0, 1, 2) and (2, 1, 3), counter-clockwise from outside. */
	corners: readonly [Vec3, Vec3, Vec3, Vec3];
}

export const FACES: readonly FaceDef[] = [
	{ dir: [-1, 0, 0], corners: [[0, 1, 0], [0, 0, 0], [0, 1, 1], [0, 0, 1]] },
	{ dir: [1, 0, 0], corners: [[1, 1, 1], [1, 0, 1], [1, 1, 0], [1, 0, 0]] },
	{ dir: [0, -1, 0], corners: [[1, 0, 1], [0, 0, 1], [1, 0, 0], [0, 0, 0]] },
	{ dir: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [0, 1, 0], [1, 1, 0]] },
	{ dir: [0, 0, -1], corners: [[1, 0, 0], [0, 0, 0], [1, 1, 0], [0, 1, 0]] },
	{ dir: [0, 0, 1], corners: [[0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]] },
];

export interface VisibleFace {
	voxel: Voxel;
	/** Index into FACES. */
	face: number;
}

const key = (x: number, y: number, z: number) => `${x},${y},${z}`;

/** Faces not touching a filled neighbour. The first voxel at a position wins; duplicates are dropped. */
export const visibleFaces = (voxels: readonly Voxel[]): VisibleFace[] => {
	const filled = new Set(voxels.map((voxel) => key(voxel.x, voxel.y, voxel.z)));
	const seen = new Set<string>();
	const faces: VisibleFace[] = [];
	for (const voxel of voxels) {
		const here = key(voxel.x, voxel.y, voxel.z);
		if (seen.has(here)) continue;
		seen.add(here);
		FACES.forEach(({ dir: [dx, dy, dz] }, face) => {
			if (!filled.has(key(voxel.x + dx, voxel.y + dy, voxel.z + dz))) faces.push({ voxel, face });
		});
	}
	return faces;
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/voxel/faces.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Implement the three.js mesh builder**

`src/lib/voxel/mesh.ts`:

```ts
import { BufferGeometry, Color, Float32BufferAttribute, Mesh, MeshLambertMaterial } from 'three';
import { FACES, visibleFaces } from './faces';
import type { Voxel } from './model';

export interface VoxelMeshOptions {
	/** World units per voxel. */
	scale?: number;
	/** Put the bottom-centre of the model's bounds at the origin. */
	center?: boolean;
}

/** One merged geometry with per-vertex colours; hidden faces are culled. */
export const buildVoxelGeometry = (
	voxels: readonly Voxel[],
	{ scale = 1, center = true }: VoxelMeshOptions = {},
): BufferGeometry => {
	let ox = 0;
	let oy = 0;
	let oz = 0;
	if (center && voxels.length > 0) {
		let minX = Infinity, maxX = -Infinity, minY = Infinity, minZ = Infinity, maxZ = -Infinity;
		for (const { x, y, z } of voxels) {
			minX = Math.min(minX, x);
			maxX = Math.max(maxX, x);
			minY = Math.min(minY, y);
			minZ = Math.min(minZ, z);
			maxZ = Math.max(maxZ, z);
		}
		ox = -(minX + maxX + 1) / 2;
		oy = -minY;
		oz = -(minZ + maxZ + 1) / 2;
	}

	const positions: number[] = [];
	const normals: number[] = [];
	const colors: number[] = [];
	const indices: number[] = [];
	const colorCache = new Map<string, Color>();

	for (const { voxel, face } of visibleFaces(voxels)) {
		const { dir, corners } = FACES[face];
		let color = colorCache.get(voxel.color);
		if (!color) {
			// Hex is sRGB; Color converts it to the linear working space vertex colours expect.
			color = new Color(voxel.color);
			colorCache.set(voxel.color, color);
		}
		const base = positions.length / 3;
		for (const [cx, cy, cz] of corners) {
			positions.push((voxel.x + cx + ox) * scale, (voxel.y + cy + oy) * scale, (voxel.z + cz + oz) * scale);
			normals.push(...dir);
			colors.push(color.r, color.g, color.b);
		}
		indices.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
	}

	const geometry = new BufferGeometry();
	geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
	geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
	geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
	geometry.setIndex(indices);
	return geometry;
};

export const buildVoxelMesh = (voxels: readonly Voxel[], options?: VoxelMeshOptions): Mesh =>
	new Mesh(buildVoxelGeometry(voxels, options), new MeshLambertMaterial({ vertexColors: true }));
```

- [ ] **Step 6: Typecheck**

Run: `npx astro check`
Expected: `0 errors`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/voxel/faces.ts src/lib/voxel/faces.test.ts src/lib/voxel/mesh.ts
git commit -m "feat: voxel face culling and merged three.js voxel meshes"
```

---

### Task 3: Terrain, idle poses, Cast types, voxel Minh and the loader seam

**Files:**
- Create: `src/world/terrain.ts`, `src/world/idle.ts`, `src/world/cast.ts`, `src/world/characters/humanoid.ts`, `src/world/characters/minh.ts`, `src/world/characters/index.ts`, `src/world/load-character.ts`
- Test: `src/world/terrain.test.ts`, `src/world/idle.test.ts`, `src/world/characters/cast.test.ts`

**Interfaces:**
- Consumes: `VoxelModel`, `Box`, `modelFromBoxes`, `parseVoxelModel` (Task 1); `buildVoxelMesh` (Task 2).
- Produces:
  - terrain: `BLOCK = 4`, `GRID_W = 48`, `GRID_D = 30`, `ORIGIN_X = -96`, `ORIGIN_Z = -60`, `type Surface = 'sea' | 'pond' | 'sand' | 'grass' | 'path' | 'cliff'`, `terrainAt(gx: number, gz: number): { height: number; surface: Surface }`, `surfaceY(x: number, z: number): number`, `isLand(x: number, z: number): boolean`
  - idle: `type Idle = { kind: 'bob' } | { kind: 'float' } | { kind: 'wander'; radius: number; hop: boolean } | { kind: 'soar' }`, `interface Pose { dx: number; dy: number; dz: number; heading: number | null; sway: number }`, `idlePose(idle: Idle, t: number, seed: number): Pose`, `WANDER_SPEED = 0.35`
  - cast: `type CharacterSource = { kind: 'voxels'; model: VoxelModel; scale?: number }`, `interface CastMember { id: string; name: string; source: CharacterSource; position: readonly [x: number, z: number]; facing: number; idle: Idle; lines: readonly string[] }`
  - humanoid: `HUMANOID_KEYS` doc, `humanoidBoxes(): Box[]`
  - characters: `cast: CastMember[]` from `src/world/characters/index.ts`
  - loader: `loadCharacter(source: CharacterSource): Promise<Object3D>`

- [ ] **Step 1: Write the failing terrain and idle tests**

`src/world/terrain.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { BLOCK, GRID_D, GRID_W, isLand, surfaceY, terrainAt } from './terrain';

describe('terrainAt', () => {
	it('is grass at the island centre, one block high', () => {
		expect(terrainAt(24, 12)).toEqual({ height: 1, surface: 'grass' });
	});

	it('is a path along the middle rows', () => {
		expect(terrainAt(24, 15)).toEqual({ height: 1, surface: 'path' });
	});

	it('is sea outside the grid and past the island edge', () => {
		expect(terrainAt(-1, 0).surface).toBe('sea');
		expect(terrainAt(GRID_W, 0).surface).toBe('sea');
		expect(terrainAt(0, 0)).toEqual({ height: 0, surface: 'sea' });
	});

	it('has a five-block cliff at the east end', () => {
		expect(terrainAt(44, 14)).toEqual({ height: 5, surface: 'cliff' });
	});

	it('has a sunken pond', () => {
		expect(terrainAt(20, 20)).toEqual({ height: 0, surface: 'pond' });
	});

	it('rings the island with sand', () => {
		expect(terrainAt(24, GRID_D - 2).surface).toBe('sand');
	});
});

describe('surfaceY / isLand', () => {
	it('converts world coordinates to the block top', () => {
		expect(surfaceY(0, -10)).toBe(1 * BLOCK);
		expect(surfaceY(80, -4)).toBe(5 * BLOCK);
		expect(surfaceY(-500, 0)).toBe(0);
	});

	it('treats sea and pond as not land', () => {
		expect(isLand(0, -10)).toBe(true);
		expect(isLand(-500, 0)).toBe(false);
		expect(isLand(-14, 22)).toBe(false);
	});
});
```

`src/world/idle.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { idlePose } from './idle';

const times = Array.from({ length: 400 }, (_, i) => i * 0.137);

describe('idlePose', () => {
	it('bobs gently in place', () => {
		for (const t of times) {
			const pose = idlePose({ kind: 'bob' }, t, 1);
			expect(pose.dx).toBe(0);
			expect(pose.dy).toBeGreaterThanOrEqual(0);
			expect(pose.dy).toBeLessThanOrEqual(0.3);
			expect(pose.heading).toBeNull();
		}
	});

	it('floats well above the ground', () => {
		for (const t of times) {
			const { dy } = idlePose({ kind: 'float' }, t, 0);
			expect(dy).toBeGreaterThanOrEqual(1.8);
			expect(dy).toBeLessThanOrEqual(4.2);
		}
	});

	it('wanders within its radius and faces where it walks', () => {
		for (const t of times) {
			const pose = idlePose({ kind: 'wander', radius: 6, hop: false }, t, 2);
			expect(Math.abs(pose.dx)).toBeLessThanOrEqual(6);
			expect(Math.abs(pose.dz)).toBeLessThanOrEqual(3);
			expect(pose.heading).not.toBeNull();
			expect(pose.dy).toBe(0);
		}
	});

	it('hops only when asked, never below the ground', () => {
		const hops = times.map((t) => idlePose({ kind: 'wander', radius: 6, hop: true }, t, 0).dy);
		expect(Math.min(...hops)).toBeGreaterThanOrEqual(0);
		expect(Math.max(...hops)).toBeGreaterThan(0.5);
	});

	it('is deterministic', () => {
		expect(idlePose({ kind: 'soar' }, 3.3, 5)).toEqual(idlePose({ kind: 'soar' }, 3.3, 5));
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/world`
Expected: FAIL, `Failed to resolve import "./terrain"` and `"./idle"`.

- [ ] **Step 3: Implement terrain**

`src/world/terrain.ts`:

```ts
/** The island is a GRID_W × GRID_D grid of BLOCK-sized columns, centred on the world origin. */
export const BLOCK = 4;
export const GRID_W = 48;
export const GRID_D = 30;
export const ORIGIN_X = -(GRID_W / 2) * BLOCK;
export const ORIGIN_Z = -(GRID_D / 2) * BLOCK;

export type Surface = 'sea' | 'pond' | 'sand' | 'grass' | 'path' | 'cliff';

const SEA = { height: 0, surface: 'sea' } as const;

/** Column height (in blocks) and surface at grid cell (gx, gz). */
export const terrainAt = (gx: number, gz: number): { height: number; surface: Surface } => {
	if (gx < 0 || gz < 0 || gx >= GRID_W || gz >= GRID_D) return SEA;
	const edge = ((gx - 23.5) / 23) ** 2 + ((gz - 14.5) / 14) ** 2;
	if (edge > 1) return SEA;
	if ((gx - 20) ** 2 + (gz - 20) ** 2 <= 6) return { height: 0, surface: 'pond' };
	if (edge > 0.82) return { height: 1, surface: 'sand' };
	if (gx >= 40) return { height: 5, surface: 'cliff' };
	if (gz === 15 || gz === 16) return { height: 1, surface: 'path' };
	return { height: 1, surface: 'grass' };
};

const cellOf = (x: number, z: number) =>
	[Math.floor((x - ORIGIN_X) / BLOCK), Math.floor((z - ORIGIN_Z) / BLOCK)] as const;

/** World-space y of the ground top at world (x, z). */
export const surfaceY = (x: number, z: number): number => terrainAt(...cellOf(x, z)).height * BLOCK;

export const isLand = (x: number, z: number): boolean => {
	const { surface } = terrainAt(...cellOf(x, z));
	return surface !== 'sea' && surface !== 'pond';
};
```

- [ ] **Step 4: Implement idle poses**

`src/world/idle.ts`:

```ts
export type Idle =
	| { kind: 'bob' }
	| { kind: 'float' }
	| { kind: 'wander'; radius: number; hop: boolean }
	| { kind: 'soar' };

export interface Pose {
	dx: number;
	dy: number;
	dz: number;
	/** Absolute facing (radians around y) when the pose decides it; null keeps the Cast Member's own facing. */
	heading: number | null;
	/** Small roll around z, radians. */
	sway: number;
}

export const WANDER_SPEED = 0.35;

/** Offset from a Cast Member's base position at time t (seconds). Pure, so it can be tested and reused for a still frame. */
export const idlePose = (idle: Idle, t: number, seed: number): Pose => {
	switch (idle.kind) {
		case 'bob':
			return { dx: 0, dy: (Math.sin(t * 2 + seed) + 1) * 0.15, dz: 0, heading: null, sway: Math.sin(t * 1.3 + seed) * 0.03 };
		case 'float':
			return { dx: 0, dy: 3 + Math.sin(t * 1.5 + seed) * 1.2, dz: 0, heading: null, sway: Math.sin(t * 0.9 + seed) * 0.06 };
		case 'soar':
			return { dx: 0, dy: Math.sin(t * 0.6 + seed) * 1.5, dz: 0, heading: null, sway: Math.sin(t * 0.4 + seed) * 0.05 };
		case 'wander': {
			// A figure-eight: x swings the full radius, z half of it.
			const a = t * WANDER_SPEED + seed;
			const r = idle.radius;
			return {
				dx: r * Math.sin(a),
				dy: idle.hop ? Math.abs(Math.sin(t * 6 + seed)) * 0.8 : 0,
				dz: (r / 2) * Math.sin(2 * a),
				heading: Math.atan2(r * Math.cos(a), r * Math.cos(2 * a)),
				sway: 0,
			};
		}
	}
};
```

- [ ] **Step 5: Run terrain and idle tests to verify they pass**

Run: `npx vitest run src/world/terrain.test.ts src/world/idle.test.ts`
Expected: PASS (13 tests).

- [ ] **Step 6: Write the failing cast validity test**

`src/world/characters/cast.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseVoxelModel } from '../../lib/voxel/model';
import { idlePose, WANDER_SPEED } from '../idle';
import { isLand } from '../terrain';
import { cast } from './index';

describe('cast', () => {
	it('has unique ids', () => {
		const ids = cast.map((m) => m.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it.each(cast.map((m) => [m.id, m] as const))('%s parses, has lines, and stands on land', (_, member) => {
		expect(parseVoxelModel(member.source.model).length).toBeGreaterThan(0);
		expect(member.lines.length).toBeGreaterThan(0);
		expect(member.name.trim()).not.toBe('');
		const [x, z] = member.position;
		expect(isLand(x, z)).toBe(true);
	});

	it.each(cast.filter((m) => m.idle.kind === 'wander').map((m) => [m.id, m] as const))(
		'%s never wanders into water',
		(_, member) => {
			const [x, z] = member.position;
			const period = (2 * Math.PI) / WANDER_SPEED;
			for (let i = 0; i < 200; i++) {
				const { dx, dz } = idlePose(member.idle, (i / 200) * period, 0);
				expect(isLand(x + dx, z + dz)).toBe(true);
			}
		},
	);
});
```

- [ ] **Step 7: Run it to verify it fails**

Run: `npx vitest run src/world/characters/cast.test.ts`
Expected: FAIL, `Failed to resolve import "./index"`.

- [ ] **Step 8: Implement Cast types, the humanoid base and Minh**

`src/world/cast.ts`:

```ts
import type { VoxelModel } from '../lib/voxel/model';
import type { Idle } from './idle';

/**
 * Where a Cast Member's model comes from. Upgrade seam: a future `{ kind: 'vox'; url: string }`
 * (MagicaVoxel) joins this union and `loadCharacter` without touching any caller.
 */
export type CharacterSource = { kind: 'voxels'; model: VoxelModel; scale?: number };

export interface CastMember {
	id: string;
	name: string;
	source: CharacterSource;
	/** Base position on the island, world units. */
	position: readonly [x: number, z: number];
	/** Radians around y; 0 faces the camera (+z). */
	facing: number;
	idle: Idle;
	lines: readonly string[];
}
```

`src/world/characters/humanoid.ts`:

```ts
import type { Box } from '../../lib/voxel/model';

/**
 * A chibi body about 16 voxels tall: x 0–9, y 0–15, body z 3–8 (front face at z = 8, front details at z = 9),
 * leaving z 0–2 free behind for hair or tails. Palette keys: K skin, H hair, T top, B bottom, S shoes, E eyes.
 */
export const humanoidBoxes = (): Box[] => [
	// shoes and legs
	[2, 0, 4, 3, 0, 7, 'S'],
	[6, 0, 4, 7, 0, 7, 'S'],
	[2, 1, 5, 3, 5, 6, 'B'],
	[6, 1, 5, 7, 5, 6, 'B'],
	// torso, sleeves, hands
	[2, 6, 4, 7, 10, 7, 'T'],
	[0, 8, 5, 1, 10, 6, 'T'],
	[8, 8, 5, 9, 10, 6, 'T'],
	[0, 6, 5, 1, 7, 6, 'K'],
	[8, 6, 5, 9, 7, 6, 'K'],
	// head, hair cap, back of hair, sides
	[1, 11, 3, 8, 15, 8, 'K'],
	[1, 15, 3, 8, 15, 8, 'H'],
	[1, 11, 3, 8, 15, 3, 'H'],
	[1, 13, 3, 1, 15, 7, 'H'],
	[8, 13, 3, 8, 15, 7, 'H'],
	// eyes
	[3, 13, 8, 3, 13, 8, 'E'],
	[6, 13, 8, 6, 13, 8, 'E'],
];
```

`src/world/characters/minh.ts`:

```ts
import { modelFromBoxes } from '../../lib/voxel/model';
import type { CastMember } from '../cast';
import { humanoidBoxes } from './humanoid';

export const minh: CastMember = {
	id: 'minh',
	name: 'Minh',
	position: [-60, 12],
	facing: 0.2,
	idle: { kind: 'bob' },
	lines: [
		"Hi, I'm Minh! Grab a matcha. I'm looking for a Summer 2027 internship.",
		"Currently building backend, infra, and applied-AI things.",
		'Keep scrolling. Someone big is waiting on the cliff.',
	],
	source: {
		kind: 'voxels',
		model: modelFromBoxes(
			{
				K: '#f3d9b8', // skin
				H: '#141414', // black hair (top)
				h: '#3a3a3a', // two-block shaved sides
				T: '#f1f1f1', // tee
				B: '#8a8f98', // sweatpants
				S: '#fafafa', // sneakers
				E: '#1b1b1b',
				G: '#c9ccd1', // silver glasses frame
				L: '#2a2f36', // lenses
				C: '#d9dde3', // silver chain and ring
				W: '#b07a4f', // table
				P: '#a7adb7', // laptop
				M: '#9cc25b', // iced matcha
				s: '#2f6b3a', // straw
			},
			[
				...humanoidBoxes(),
				// two-block: fuller top with a fringe, short darker sides
				[1, 16, 3, 8, 16, 8, 'H'],
				[2, 15, 9, 7, 15, 9, 'H'],
				[1, 12, 4, 1, 14, 7, 'h'],
				[8, 12, 4, 8, 14, 7, 'h'],
				// glasses
				[2, 13, 9, 7, 13, 9, 'G'],
				[3, 13, 9, 3, 13, 9, 'L'],
				[6, 13, 9, 6, 13, 9, 'L'],
				// silver chain, pendant, ring
				[3, 10, 8, 6, 10, 8, 'C'],
				[4, 9, 8, 5, 9, 8, 'C'],
				[9, 6, 7, 9, 6, 7, 'C'],
				// low table with laptop and iced matcha
				[12, 0, 4, 17, 3, 8, 'W'],
				[12, 4, 5, 15, 4, 8, 'P'],
				[12, 5, 5, 15, 8, 5, 'P'],
				[16, 4, 6, 17, 6, 7, 'M'],
				[17, 7, 6, 17, 8, 6, 's'],
			],
		),
	},
};
```

`src/world/characters/index.ts`:

```ts
import type { CastMember } from '../cast';
import { minh } from './minh';

export const cast: CastMember[] = [minh];
```

- [ ] **Step 9: Implement the loader seam**

`src/world/load-character.ts`:

```ts
import type { Object3D } from 'three';
import { buildVoxelMesh } from '../lib/voxel/mesh';
import { parseVoxelModel } from '../lib/voxel/model';
import type { CharacterSource } from './cast';

/** Async so a future file-based source (e.g. `.vox`) can fetch without changing callers. */
export const loadCharacter = async (source: CharacterSource): Promise<Object3D> => {
	switch (source.kind) {
		case 'voxels':
			return buildVoxelMesh(parseVoxelModel(source.model), { scale: source.scale ?? 1 });
	}
};
```

- [ ] **Step 10: Run all tests and the typecheck**

Run: `npm test && npx astro check`
Expected: all tests PASS (including `cast.test.ts` for `minh`); `0 errors`.

- [ ] **Step 11: Commit**

```bash
git add src/world
git commit -m "feat: island terrain, idle poses, Cast Member types, voxel Minh, and the loadCharacter seam"
```

---

### Task 4: Scroll-driven camera path

**Files:**
- Create: `src/world/camera-path.ts`
- Test: `src/world/camera-path.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `type Vec3 = readonly [number, number, number]`, `interface CameraKey { position: Vec3; target: Vec3 }`, `CAMERA_KEYS: readonly CameraKey[]`, `cameraAt(progress: number, keys?: readonly CameraKey[]): CameraKey`, `scrollProgress(scrollY: number, scrollHeight: number, viewportHeight: number): number`

- [ ] **Step 1: Write the failing tests**

`src/world/camera-path.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CAMERA_KEYS, cameraAt, scrollProgress, type CameraKey } from './camera-path';

const dist = (a: readonly number[], b: readonly number[]) => Math.hypot(...a.map((v, i) => v - b[i]));

describe('cameraAt', () => {
	it('hits the first and last keys exactly', () => {
		expect(cameraAt(0)).toEqual(CAMERA_KEYS[0]);
		expect(cameraAt(1)).toEqual(CAMERA_KEYS[CAMERA_KEYS.length - 1]);
	});

	it('clamps out-of-range and non-finite progress', () => {
		expect(cameraAt(-3)).toEqual(cameraAt(0));
		expect(cameraAt(7)).toEqual(cameraAt(1));
		expect(cameraAt(Number.NaN)).toEqual(cameraAt(0));
	});

	it('moves smoothly: tiny progress steps give tiny camera steps', () => {
		for (let i = 0; i < 1000; i++) {
			const a = cameraAt(i / 1000);
			const b = cameraAt((i + 1) / 1000);
			expect(dist(a.position, b.position)).toBeLessThan(1);
			expect(dist(a.target, b.target)).toBeLessThan(1);
		}
	});

	it('handles a single key and rejects none', () => {
		const only: CameraKey = { position: [1, 2, 3], target: [0, 0, 0] };
		expect(cameraAt(0.5, [only])).toEqual(only);
		expect(() => cameraAt(0.5, [])).toThrow('at least one key');
	});
});

describe('scrollProgress', () => {
	it('is the scrolled fraction of the scrollable range', () => {
		expect(scrollProgress(500, 3000, 1000)).toBe(0.25);
	});

	it('is 0 when the page does not scroll (no NaN)', () => {
		expect(scrollProgress(0, 800, 1000)).toBe(0);
		expect(scrollProgress(0, 1000, 1000)).toBe(0);
	});

	it('clamps overscroll bounce', () => {
		expect(scrollProgress(-40, 3000, 1000)).toBe(0);
		expect(scrollProgress(2100, 3000, 1000)).toBe(1);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/world/camera-path.test.ts`
Expected: FAIL, `Failed to resolve import "./camera-path"`.

- [ ] **Step 3: Implement**

`src/world/camera-path.ts`:

```ts
export type Vec3 = readonly [number, number, number];

export interface CameraKey {
	position: Vec3;
	target: Vec3;
}

/** West to east: Minh → café (Joker) → courthouse (Phoenix) → town hall (Isabelle) → Reshiram's cliff. */
export const CAMERA_KEYS: readonly CameraKey[] = [
	{ position: [-72, 26, 62], target: [-56, 8, 4] },
	{ position: [-34, 28, 64], target: [-28, 8, -10] },
	{ position: [6, 28, 64], target: [8, 8, -12] },
	{ position: [42, 30, 66], target: [40, 10, -12] },
	{ position: [62, 46, 82], target: [80, 40, -4] },
];

const clamp01 = (value: number) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0);

const catmullRom = (p0: number, p1: number, p2: number, p3: number, t: number) =>
	0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t * t * t);

const sample = (points: readonly Vec3[], i: number, t: number): Vec3 => {
	const at = (k: number) => points[Math.min(points.length - 1, Math.max(0, k))];
	const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
	return [0, 1, 2].map((axis) => catmullRom(p0[axis], p1[axis], p2[axis], p3[axis], t)) as unknown as Vec3;
};

/** Camera position and look-at target for scroll progress 0–1, along a Catmull-Rom curve through the keys. */
export const cameraAt = (progress: number, keys: readonly CameraKey[] = CAMERA_KEYS): CameraKey => {
	if (keys.length === 0) throw new Error('cameraAt needs at least one key');
	if (keys.length === 1) return keys[0];
	const p = clamp01(progress) * (keys.length - 1);
	const i = Math.min(Math.floor(p), keys.length - 2);
	const t = p - i;
	if (t === 0) return keys[i];
	if (i === keys.length - 2 && t === 1) return keys[i + 1];
	return {
		position: sample(keys.map((k) => k.position), i, t),
		target: sample(keys.map((k) => k.target), i, t),
	};
};

/** Fraction of the page scrolled, 0 when the page cannot scroll. */
export const scrollProgress = (scrollY: number, scrollHeight: number, viewportHeight: number): number => {
	const range = scrollHeight - viewportHeight;
	return range > 0 ? clamp01(scrollY / range) : 0;
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/world/camera-path.test.ts`
Expected: PASS (7 tests). If the smoothness test fails because a key pair is too far apart for 1/1000 steps, the keys are wrong, not the threshold: keep consecutive keys within ~250 units.

- [ ] **Step 5: Commit**

```bash
git add src/world/camera-path.ts src/world/camera-path.test.ts
git commit -m "feat: scroll-driven Catmull-Rom camera path"
```

---

### Task 5: Day/night presets and the town

**Files:**
- Create: `src/world/theme.ts`, `src/world/buildings.ts`, `src/world/town.ts`
- Test: `src/world/buildings.test.ts`

**Interfaces:**
- Consumes: `resolveTheme` (`src/lib/theme.ts`); `modelFromBoxes`, `parseVoxelModel`, `offsetVoxels`, `Voxel`, `VoxelModel` (Task 1); `buildVoxelGeometry`, `buildVoxelMesh` (Task 2); `terrainAt`, `surfaceY`, `isLand`, `BLOCK`, `GRID_W`, `GRID_D`, `ORIGIN_X`, `ORIGIN_Z` (Task 3).
- Produces:
  - theme: `type WorldTheme = 'light' | 'dark'`, `interface WorldPreset { sky: string; hemiSky: string; hemiGround: string; hemiIntensity: number; sun: string; sunIntensity: number; sea: string; glow: string; stars: boolean; gengarGlow: number }`, `PRESETS: Record<WorldTheme, WorldPreset>`, `documentTheme(): WorldTheme`, `watchTheme(onChange: (theme: WorldTheme) => void): () => void`
  - buildings: `interface Building { model: VoxelModel; windows?: VoxelModel }`, `interface Placement { building: Building; at: readonly [x: number, z: number] }`, `PLACEMENTS: readonly Placement[]`
  - town: `interface Town { group: Group; seaMaterial: MeshLambertMaterial; windowMaterial: MeshBasicMaterial; stars: Points }`, `buildTown(): Town`

- [ ] **Step 1: Write the failing placement test**

`src/world/buildings.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseVoxelModel } from '../lib/voxel/model';
import { PLACEMENTS } from './buildings';
import { isLand } from './terrain';

describe('PLACEMENTS', () => {
	it.each(PLACEMENTS.map((p, i) => [i, p] as const))('placement %i parses and its origin is on land', (_, placement) => {
		expect(parseVoxelModel(placement.building.model).length).toBeGreaterThan(0);
		if (placement.building.windows) expect(parseVoxelModel(placement.building.windows).length).toBeGreaterThan(0);
		expect(isLand(...placement.at)).toBe(true);
	});
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/world/buildings.test.ts`
Expected: FAIL, `Failed to resolve import "./buildings"`.

- [ ] **Step 3: Implement the building and tree models**

`src/world/buildings.ts`:

```ts
import { modelFromBoxes, type VoxelModel } from '../lib/voxel/model';

/** A prop on the island. `windows` shares the model's coordinates and is drawn unlit so it can glow at night. */
export interface Building {
	model: VoxelModel;
	windows?: VoxelModel;
}

export interface Placement {
	building: Building;
	/** World x, z of the model's (0, 0, 0) corner; fronts face +z. */
	at: readonly [x: number, z: number];
}

const WINDOW = { w: '#ffffff' };

const cafe: Building = {
	model: modelFromBoxes({ R: '#8b4a3a', D: '#3b3b45', W: '#6b4a2b', A: '#2f6b45' }, [
		[1, 0, 1, 20, 13, 14, 'R'],
		[0, 14, 0, 21, 14, 15, 'D'],
		[2, 15, 2, 19, 15, 13, 'D'],
		[4, 16, 4, 17, 16, 11, 'D'],
		[9, 0, 15, 12, 8, 15, 'W'],
		[5, 9, 16, 16, 9, 17, 'A'],
	]),
	windows: modelFromBoxes(WINDOW, [
		[2, 4, 15, 6, 8, 15, 'w'],
		[15, 4, 15, 19, 8, 15, 'w'],
	]),
};

const courthouse: Building = {
	model: modelFromBoxes({ S: '#e3ddd0', G: '#8b8f99', C: '#f2efe8', W: '#6b4a2b' }, [
		[0, 0, 0, 25, 1, 19, 'G'],
		[2, 2, 2, 23, 15, 15, 'S'],
		[3, 2, 17, 4, 15, 18, 'C'],
		[8, 2, 17, 9, 15, 18, 'C'],
		[16, 2, 17, 17, 15, 18, 'C'],
		[21, 2, 17, 22, 15, 18, 'C'],
		[1, 16, 1, 24, 17, 19, 'G'],
		[4, 18, 15, 21, 18, 19, 'G'],
		[8, 19, 15, 17, 19, 19, 'G'],
		[11, 20, 15, 14, 20, 19, 'G'],
		[11, 2, 16, 14, 10, 16, 'W'],
	]),
	windows: modelFromBoxes(WINDOW, [
		[5, 6, 16, 7, 11, 16, 'w'],
		[18, 6, 16, 20, 11, 16, 'w'],
	]),
};

const townHall: Building = {
	model: modelFromBoxes({ Y: '#e8c37d', G: '#4f8f46', W: '#6b4a2b', F: '#d84545', P: '#dddddd' }, [
		[1, 0, 1, 22, 12, 14, 'Y'],
		[0, 13, 0, 23, 13, 15, 'G'],
		[2, 14, 2, 21, 14, 13, 'G'],
		[4, 15, 4, 19, 15, 11, 'G'],
		[6, 16, 6, 17, 16, 9, 'G'],
		[10, 0, 15, 13, 8, 15, 'W'],
		[11, 17, 7, 11, 24, 7, 'P'],
		[12, 21, 7, 15, 24, 7, 'F'],
	]),
	windows: modelFromBoxes(WINDOW, [
		[3, 4, 15, 7, 8, 15, 'w'],
		[16, 4, 15, 20, 8, 15, 'w'],
	]),
};

const tree: Building = {
	model: modelFromBoxes({ T: '#7a5230', L: '#3f9c4a', l: '#357f3d' }, [
		[2, 0, 2, 3, 5, 3, 'T'],
		[0, 6, 0, 5, 10, 5, 'L'],
		[1, 11, 1, 4, 12, 4, 'l'],
	]),
};

const TREE_SPOTS: readonly (readonly [number, number])[] = [
	[-80, -12], [-72, 28], [-46, 30], [-22, -46], [14, 32], [30, 38], [46, 26], [56, -30], [-4, 36],
];

export const PLACEMENTS: readonly Placement[] = [
	{ building: cafe, at: [-52, -40] },
	{ building: courthouse, at: [-8, -44] },
	{ building: townHall, at: [26, -42] },
	...TREE_SPOTS.map((at) => ({ building: tree, at })),
];
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/world/buildings.test.ts`
Expected: PASS (12 tests). If a tree spot fails `isLand`, move that spot one block (4 units) toward the island centre.

- [ ] **Step 5: Implement day/night presets**

`src/world/theme.ts`:

```ts
import { resolveTheme } from '../lib/theme';

export type WorldTheme = 'light' | 'dark';

export interface WorldPreset {
	sky: string;
	hemiSky: string;
	hemiGround: string;
	hemiIntensity: number;
	sun: string;
	sunIntensity: number;
	sea: string;
	/** Unlit building-window colour. */
	glow: string;
	stars: boolean;
	/** PointLight intensity on Gengar (0 = off). */
	gengarGlow: number;
}

/** Light mode is day; dark mode is night. */
export const PRESETS: Record<WorldTheme, WorldPreset> = {
	light: {
		sky: '#bfe3ff',
		hemiSky: '#ffffff',
		hemiGround: '#9fd99a',
		hemiIntensity: 1.6,
		sun: '#fff4e0',
		sunIntensity: 2.2,
		sea: '#5fb6e6',
		glow: '#9cc9e8',
		stars: false,
		gengarGlow: 0,
	},
	dark: {
		sky: '#16233a',
		hemiSky: '#6b7fb3',
		hemiGround: '#1d3a2a',
		hemiIntensity: 0.7,
		sun: '#9fb4ff',
		sunIntensity: 0.6,
		sea: '#1d3557',
		glow: '#ffd27a',
		stars: true,
		gengarGlow: 120,
	},
};

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)');

/** The theme the page is actually showing: the stored/toggled choice, else the OS setting. */
export const documentTheme = (): WorldTheme => {
	const chosen = document.documentElement.dataset.theme;
	return resolveTheme(chosen === 'light' || chosen === 'dark' ? chosen : null, systemDark().matches);
};

/** Calls onChange when the toggle flips `data-theme` or the OS theme changes. Returns an unsubscribe. */
export const watchTheme = (onChange: (theme: WorldTheme) => void): (() => void) => {
	const notify = () => onChange(documentTheme());
	const observer = new MutationObserver(notify);
	observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
	const media = systemDark();
	media.addEventListener('change', notify);
	return () => {
		observer.disconnect();
		media.removeEventListener('change', notify);
	};
};
```

- [ ] **Step 6: Implement the town**

`src/world/town.ts`:

```ts
import {
	BufferGeometry,
	Float32BufferAttribute,
	Group,
	Mesh,
	MeshBasicMaterial,
	MeshLambertMaterial,
	PlaneGeometry,
	Points,
	PointsMaterial,
} from 'three';
import { buildVoxelGeometry, buildVoxelMesh } from '../lib/voxel/mesh';
import { offsetVoxels, parseVoxelModel, type Voxel } from '../lib/voxel/model';
import { PLACEMENTS } from './buildings';
import { BLOCK, GRID_D, GRID_W, ORIGIN_X, ORIGIN_Z, surfaceY, terrainAt, type Surface } from './terrain';

export interface Town {
	group: Group;
	seaMaterial: MeshLambertMaterial;
	windowMaterial: MeshBasicMaterial;
	stars: Points;
}

const TOP: Record<Exclude<Surface, 'sea' | 'pond'>, string> = {
	grass: '#7cc46a',
	sand: '#e9d8a6',
	path: '#d8c48f',
	cliff: '#7cc46a',
};
const DIRT = '#8a6a4a';
const STONE = '#9a9590';

/** Terrain columns in grid units, two dirt blocks deep below sea level. */
const terrainVoxels = (): Voxel[] => {
	const voxels: Voxel[] = [];
	for (let gx = 0; gx < GRID_W; gx++) {
		for (let gz = 0; gz < GRID_D; gz++) {
			const { height, surface } = terrainAt(gx, gz);
			if (surface === 'sea') continue;
			for (let y = -2; y < height; y++) {
				const top = y === height - 1 && surface !== 'pond';
				const color = top ? TOP[surface as keyof typeof TOP] : surface === 'cliff' && y >= 1 ? STONE : DIRT;
				voxels.push({ x: gx, y, z: gz, color });
			}
		}
	}
	return voxels;
};

/** A fixed, seeded dome of stars so every visit sees the same sky. */
const buildStars = (): Points => {
	let seed = 7;
	const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
	const positions: number[] = [];
	for (let i = 0; i < 400; i++) {
		const theta = rand() * Math.PI * 2;
		const phi = rand() * Math.PI * 0.45;
		positions.push(450 * Math.sin(phi) * Math.cos(theta), 450 * Math.cos(phi), 450 * Math.sin(phi) * Math.sin(theta));
	}
	const geometry = new BufferGeometry();
	geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
	return new Points(geometry, new PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, fog: false }));
};

export const buildTown = (): Town => {
	const group = new Group();

	const terrain = buildVoxelMesh(terrainVoxels(), { scale: BLOCK, center: false });
	terrain.position.set(ORIGIN_X, 0, ORIGIN_Z);

	const seaMaterial = new MeshLambertMaterial();
	const sea = new Mesh(new PlaneGeometry(1200, 1200).rotateX(-Math.PI / 2), seaMaterial);
	sea.position.y = 1;

	const props: Voxel[] = [];
	const windows: Voxel[] = [];
	for (const { building, at: [x, z] } of PLACEMENTS) {
		const y = surfaceY(x, z);
		props.push(...offsetVoxels(parseVoxelModel(building.model), x, y, z));
		if (building.windows) windows.push(...offsetVoxels(parseVoxelModel(building.windows), x, y, z));
	}
	const windowMaterial = new MeshBasicMaterial();
	const stars = buildStars();

	group.add(
		terrain,
		sea,
		buildVoxelMesh(props, { center: false }),
		new Mesh(buildVoxelGeometry(windows, { center: false }), windowMaterial),
		stars,
	);
	return { group, seaMaterial, windowMaterial, stars };
};
```

- [ ] **Step 7: Run tests and typecheck**

Run: `npm test && npx astro check`
Expected: PASS; `0 errors`.

- [ ] **Step 8: Commit**

```bash
git add src/world/theme.ts src/world/buildings.ts src/world/buildings.test.ts src/world/town.ts
git commit -m "feat: voxel town (terrain, café, courthouse, town hall, trees) and day/night presets"
```

---

### Task 6: Render loop, World component and the homepage (first visible milestone)

**Files:**
- Create: `src/world/main.ts`, `src/components/World.astro`, `docs/adr/0004-threejs-homepage-world.md`
- Modify: `src/pages/index.astro`, `src/styles/theme.css`, `CONTEXT.md`

**Interfaces:**
- Consumes: everything from Tasks 2–5: `cast`, `loadCharacter`, `buildTown`, `cameraAt`, `scrollProgress`, `idlePose`, `surfaceY`, `PRESETS`, `documentTheme`, `watchTheme`.
- Produces:
  - `interface WorldOptions { reducedMotion: boolean }`
  - `interface WorldHooks { onPick?: (id: string) => void }` (unused until Task 9; declared now so Task 9 only adds code)
  - `startWorld(canvas: HTMLCanvasElement, bubble: HTMLElement, options: WorldOptions): Promise<() => void>`. It resolves to `stop()`. It records `performance.mark('world:start')` / `performance.mark('world:stop')`.
  - `<World />`: renders `.world > canvas[data-world]` and `p.speech[data-world-speech]`. While running it sets `document.documentElement.dataset.world` to `'motion'` or `'still'`.
  - CSS tokens `--color-world-sky`, `--color-world-ground`.

- [ ] **Step 1: Add the gradient tokens**

In `src/styles/theme.css`, add these lines after `--color-on-secondary: #ffffff;` in `:root`:

```css
    --color-world-sky: #bfe3ff;    /* World fallback gradient (day) */
    --color-world-ground: #9fd99a;
```

Then add these lines after `--color-on-secondary: #0f1a14;` in **both** dark blocks (the `@media (prefers-color-scheme: dark)` one and `:root[data-theme="dark"]`):

```css
    --color-world-sky: #16233a;    /* night */
    --color-world-ground: #1d3a2a;
```

- [ ] **Step 2: Write `startWorld`**

`src/world/main.ts`:

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
import { cameraAt, scrollProgress } from './camera-path';
import type { CastMember } from './cast';
import { cast } from './characters';
import { idlePose } from './idle';
import { loadCharacter } from './load-character';
import { surfaceY } from './terrain';
import { PRESETS, documentTheme, watchTheme, type WorldTheme } from './theme';
import { buildTown } from './town';

export interface WorldOptions {
	reducedMotion: boolean;
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

const pageProgress = () => scrollProgress(window.scrollY, document.documentElement.scrollHeight, window.innerHeight);

/** Builds the World into `canvas` and starts it. Resolves to a stop function that frees every GPU resource. */
export const startWorld = async (
	canvas: HTMLCanvasElement,
	bubble: HTMLElement,
	options: WorldOptions,
): Promise<() => void> => {
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
			shadow.scale.setScalar(Math.max(size.x, size.z) * 0.45);
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

	let progress = options.reducedMotion ? 0 : pageProgress();
	const aimCamera = () => {
		const { position, target } = cameraAt(progress);
		camera.position.set(...position);
		camera.lookAt(...target);
	};

	const place = (actor: Actor, t: number) => {
		const [baseX, baseZ] = actor.member.position;
		const pose = idlePose(actor.member.idle, options.reducedMotion ? 0 : t, options.reducedMotion ? 0 : actor.seed);
		const x = baseX + pose.dx;
		const z = baseZ + pose.dz;
		const ground = surfaceY(x, z);
		actor.object.position.set(x, ground + pose.dy, z);
		actor.object.rotation.set(0, pose.heading ?? actor.member.facing, pose.sway);
		actor.shadow.position.set(x, ground + 0.05, z);
	};

	const render = () => renderer.render(scene, camera);

	const start = performance.now();
	let last = start;
	let frame = 0;
	const tick = (now: number) => {
		frame = requestAnimationFrame(tick);
		const dt = Math.min(0.1, (now - last) / 1000);
		last = now;
		if (document.hidden) return;
		const t = (now - start) / 1000;
		progress += (pageProgress() - progress) * Math.min(1, dt * 6);
		aimCamera();
		for (const actor of actors) place(actor, t);
		render();
	};

	resize();
	applyTheme(documentTheme());
	aimCamera();
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

	return () => {
		cancelAnimationFrame(frame);
		window.removeEventListener('resize', onResize);
		stopTheme();
		disposeScene(scene);
		renderer.dispose();
		renderer.forceContextLoss();
		canvas.classList.remove('ready');
		performance.mark('world:stop');
	};
};
```

`bubble` is unused until Task 9. To satisfy `noUnusedParameters` if `astro check` flags it, rename it to `_bubble` in this task and back to `bubble` in Task 9.

- [ ] **Step 3: Write the World component**

`src/components/World.astro`:

```astro
---
// The homepage World: a fixed full-viewport canvas behind all content.
// The CSS gradient is the fallback when WebGL, JavaScript or the three.js import is unavailable.
---

<div class="world" aria-hidden="true">
	<canvas data-world></canvas>
</div>
<p class="speech" data-world-speech data-world-solid role="status" aria-live="polite" hidden></p>

<script>
	type Stop = () => void;
	let stop: Stop | null = null;

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
				if (!canvas.isConnected) return started();
				stop = started;
				document.documentElement.dataset.world = reducedMotion ? "still" : "motion";
			} catch (error) {
				console.error("World failed to start; keeping the gradient.", error);
			}
		});
	});

	document.addEventListener("astro:before-swap", () => {
		stop?.();
		stop = null;
		delete document.documentElement.dataset.world;
	});
</script>

<style>
	.world {
		position: fixed;
		inset: 0;
		z-index: -1;
		background: linear-gradient(var(--color-world-sky) 0 55%, var(--color-world-ground) 55% 100%);
	}

	/* A light wash keeps the World a little soft behind content. */
	.world::after {
		content: "";
		position: absolute;
		inset: 0;
		background: var(--color-background);
		opacity: 0.12;
		pointer-events: none;
	}

	canvas {
		display: block;
		width: 100%;
		height: 100%;
		opacity: 0;
		transition: opacity 600ms ease;
	}

	canvas.ready {
		opacity: 1;
	}

	.speech {
		position: fixed;
		top: 0;
		left: 0;
		z-index: 20;
		max-width: min(18rem, 80vw);
		margin: 0;
		padding: 0.5rem 0.8rem;
		background: var(--color-surface);
		color: var(--color-foreground);
		border: 2px solid var(--color-foreground);
		border-radius: var(--radius);
		box-shadow: 3px 3px 0 var(--color-foreground);
		font-size: 0.95rem;
		line-height: 1.4;
	}

	.speech :global(strong) {
		font-family: var(--font-heading);
		color: var(--color-accent);
	}
</style>
```

- [ ] **Step 4: Update the homepage**

In `src/pages/index.astro`:

1. Add `import World from "../components/World.astro";` after the `Window` import.
2. Replace `<Layout title="Home">\n\t<section class="intro">` with:

```astro
<Layout title="Home">
	<World />
	<section class="intro" data-world-solid>
```

3. After the closing `</div>` of `.desktop` (just before `</Layout>`), add:

```astro
	<div class="runway" aria-hidden="true">
		<p class="runway-hint" data-world-solid>Keep scrolling to explore the town ↓</p>
	</div>
	<p class="credit" data-world-solid>
		Characters © Nintendo / Game Freak / The Pokémon Company / Atlus / Capcom. Fan art.
	</p>
```

4. In the `<style>` block, replace the `.intro` rule:

```css
	.intro {
		width: fit-content;
		max-width: 46rem;
		margin-bottom: 2rem;
		padding: 1.25rem 1.5rem 0.5rem;
		background: var(--color-surface);
		border: 3px solid var(--color-foreground);
		border-radius: var(--radius);
		box-shadow: 6px 6px 0 var(--color-foreground);
	}
```

5. In the `.desktop` rule, replace the background/border lines (`background-color`, `background-image`, `background-size`, `border`, `border-radius`) with nothing, so the World shows between the Windows. Keep `display`, `grid-template-columns`, `gap` and `padding`. Then append:

```css
	/* Extra scroll room so the camera can travel to Reshiram's cliff; only while the World is moving. */
	.runway,
	.credit {
		display: none;
	}

	:global(:root[data-world="motion"]) .runway {
		display: block;
		height: 90vh;
	}

	:global(:root[data-world]) .credit {
		display: block;
	}

	.runway-hint {
		width: fit-content;
		margin: 3rem auto 0;
		padding: 0.4rem 1rem;
		font-family: var(--font-heading);
		background: var(--color-surface);
		border: 2px solid var(--color-foreground);
		border-radius: 999px;
	}

	.credit {
		width: fit-content;
		max-width: none;
		margin: 1.5rem auto 0;
		padding: 0.25rem 0.75rem;
		font-size: 0.8rem;
		color: var(--color-muted);
		background: var(--color-surface);
		border-radius: 999px;
	}
```

6. Inside the existing `@media (min-width: 768px)` block, add:

```css
		:global(:root[data-world="motion"]) .runway {
			height: 160vh;
		}
```

- [ ] **Step 5: Write ADR 0004 and update CONTEXT.md**

`docs/adr/0004-threejs-homepage-world.md`:

```markdown
# three.js for the homepage World

The homepage World (a 3D voxel town behind the content) is rendered with three.js. This does not conflict with ADR 0001: three.js is a rendering library, not a UI framework. It holds no component state, does no hydration, and renders nothing the page's content depends on. Every word on the homepage is still static HTML from Astro. three.js is loaded only on `/`, through a dynamic import that runs after the content has painted. Without WebGL or JavaScript, the page shows a CSS gradient instead. Characters are authored as text voxel grids in TypeScript behind a `loadCharacter(source)` seam, so a file-based model format (for example MagicaVoxel `.vox`) can be added later without changing the scene code.
```

In `CONTEXT.md`, replace the **Desktop** entry's definition line with:

```markdown
The homepage layout: a fake OS-desktop metaphor containing one Window per nav section, floating over the World.
```

and add after the **Window** entry (before `## Structure`):

```markdown

**World**:
The full-screen 3D voxel town rendered behind the homepage content; the camera travels across it as the page scrolls, and it switches between day and night with the theme. Purely decorative: nothing essential lives only in the World.
_Avoid_: Scene, background, game

**Cast Member**:
A character standing in the World (the owner or a fan-art game character), clickable for a speech bubble.
_Avoid_: NPC, sprite, avatar

**Voxel Model**:
A character or prop defined as a palette plus text layer grids (or boxes painted into them), turned into a merged mesh at runtime.
_Avoid_: Asset, 3D model (when referring to these code-authored grids)
```

- [ ] **Step 6: Run the gates**

Run: `npm test && npx astro check && npx astro build`
Expected: tests PASS; `0 errors`; build `Complete!`.

- [ ] **Step 7: Browser check of the milestone**

Start the dev server: `npx astro dev --background`. Then, in the session scratchpad (Playwright is installed there; launch with `chromium.launch({ channel: 'chrome' })`), screenshot `/` in light and dark (`colorScheme`), at the top and after scrolling to the bottom. Confirm:
- Minh stands on the island with the café, courthouse and town hall behind.
- The camera has moved to the cliff at the bottom of the scroll.
- Dark mode shows night: a dark sky, stars, and glowing windows.
- The intro card and the windows are readable.

If the scene renders black, check the browser console for shader or import errors.

- [ ] **Step 8: Commit**

```bash
git add src/world/main.ts src/components/World.astro src/pages/index.astro src/styles/theme.css docs/adr/0004-threejs-homepage-world.md CONTEXT.md
git commit -m "feat: homepage World: voxel town, scroll camera, day/night, Minh; ADR 0004"
```

---

### Task 7: Joker, Phoenix Wright and Isabelle

**Files:**
- Create: `src/world/characters/joker.ts`, `src/world/characters/phoenix.ts`, `src/world/characters/isabelle.ts`
- Modify: `src/world/characters/index.ts`

**Interfaces:**
- Consumes: `CastMember` (Task 3), `modelFromBoxes` (Task 1), `humanoidBoxes` (Task 3).
- Produces: `joker`, `phoenix`, `isabelle: CastMember`, added to `cast`.

- [ ] **Step 1: Write the three characters**

`src/world/characters/joker.ts`:

```ts
import { modelFromBoxes } from '../../lib/voxel/model';
import type { CastMember } from '../cast';
import { humanoidBoxes } from './humanoid';

export const joker: CastMember = {
	id: 'joker',
	name: 'Joker',
	position: [-30, -6],
	facing: 0.3,
	idle: { kind: 'bob' },
	lines: ['…', "Leblanc's coffee is the best in town.", 'Take your time.'],
	source: {
		kind: 'voxels',
		model: modelFromBoxes(
			{
				K: '#f1d7bd',
				H: '#141414',
				T: '#1e1e24', // coat
				B: '#2b2b33',
				S: '#4a2c1a',
				E: '#111111',
				R: '#d0182b', // gloves
				W: '#f5f5f5', // mask
			},
			[
				...humanoidBoxes(),
				// messy hair and bangs
				[0, 14, 3, 9, 16, 8, 'H'],
				[1, 13, 9, 2, 15, 9, 'H'],
				[6, 14, 9, 8, 15, 9, 'H'],
				// coat tails and open front, high collar
				[2, 3, 3, 7, 5, 4, 'T'],
				[2, 3, 7, 3, 5, 7, 'T'],
				[6, 3, 7, 7, 5, 7, 'T'],
				[2, 10, 3, 7, 11, 4, 'T'],
				// red gloves
				[0, 6, 5, 1, 7, 6, 'R'],
				[8, 6, 5, 9, 7, 6, 'R'],
				// mask with eye holes
				[2, 13, 9, 7, 14, 9, 'W'],
				[3, 13, 9, 3, 13, 9, 'E'],
				[6, 13, 9, 6, 13, 9, 'E'],
			],
		),
	},
};
```

`src/world/characters/phoenix.ts`:

```ts
import { modelFromBoxes } from '../../lib/voxel/model';
import type { CastMember } from '../cast';
import { humanoidBoxes } from './humanoid';

export const phoenix: CastMember = {
	id: 'phoenix',
	name: 'Phoenix Wright',
	position: [8, -8],
	facing: -0.15,
	idle: { kind: 'bob' },
	lines: ['Objection!', "Hold it! Have you seen Minh's résumé?", 'Take that!'],
	source: {
		kind: 'voxels',
		model: modelFromBoxes(
			{
				K: '#f1d1b0',
				H: '#121212',
				T: '#2849a8', // blue suit
				B: '#2849a8',
				S: '#3b2a1a',
				E: '#111111',
				W: '#ffffff', // shirt
				R: '#c62828', // tie
				Y: '#e0b84a', // badge
			},
			[
				...humanoidBoxes(),
				// shirt V, tie, badge
				[3, 9, 8, 6, 10, 8, 'W'],
				[4, 6, 8, 4, 9, 8, 'R'],
				[6, 8, 8, 6, 8, 8, 'Y'],
				// signature spikes sweeping back and up
				[1, 16, 3, 8, 16, 7, 'H'],
				[2, 17, 2, 6, 17, 5, 'H'],
				[2, 13, 1, 7, 15, 2, 'H'],
				[3, 14, 0, 6, 15, 0, 'H'],
			],
		),
	},
};
```

`src/world/characters/isabelle.ts`:

```ts
import { modelFromBoxes } from '../../lib/voxel/model';
import type { CastMember } from '../cast';
import { humanoidBoxes } from './humanoid';

export const isabelle: CastMember = {
	id: 'isabelle',
	name: 'Isabelle',
	position: [40, -6],
	facing: -0.3,
	idle: { kind: 'bob' },
	lines: [
		"Good morning! Today's announcement: Minh shipped a new project!",
		'Please enjoy your stay on the island!',
		'Remember to drink some water today!',
	],
	source: {
		kind: 'voxels',
		model: modelFromBoxes(
			{
				K: '#f6e3a1', // fur
				H: '#f6e3a1',
				T: '#4f9d4f', // green vest
				B: '#c94a3c', // skirt
				S: '#f6e3a1',
				E: '#111111',
				N: '#1b1b1b', // nose
				R: '#d84545', // hair tie
				W: '#ffffff', // collar
			},
			[
				...humanoidBoxes(),
				// floppy ears
				[0, 11, 5, 0, 14, 6, 'K'],
				[9, 11, 5, 9, 14, 6, 'K'],
				// top tuft with red tie
				[4, 16, 5, 5, 17, 6, 'H'],
				[4, 16, 5, 5, 16, 6, 'R'],
				// nose, collar, skirt
				[4, 12, 9, 5, 12, 9, 'N'],
				[3, 10, 8, 6, 10, 8, 'W'],
				[1, 3, 3, 8, 5, 8, 'B'],
			],
		),
	},
};
```

- [ ] **Step 2: Add them to the cast**

`src/world/characters/index.ts`:

```ts
import type { CastMember } from '../cast';
import { isabelle } from './isabelle';
import { joker } from './joker';
import { minh } from './minh';
import { phoenix } from './phoenix';

export const cast: CastMember[] = [minh, joker, phoenix, isabelle];
```

- [ ] **Step 3: Run the cast tests**

Run: `npx vitest run src/world/characters/cast.test.ts`
Expected: PASS for all four (unique ids, parse, lines, on land).

- [ ] **Step 4: Look at them**

With the dev server running, screenshot `/` scrolled to about 30%, 55% and 75%. Each character should read as itself:
- Joker: black coat, red gloves, white mask.
- Phoenix: blue suit, red tie, back-swept spikes.
- Isabelle: yellow, floppy ears, green vest, red skirt.

Adjust the boxes, not the format, if a feature is lost (for example, move a detail to the z = 9 layer so it isn't hidden).

- [ ] **Step 5: Commit**

```bash
git add src/world/characters
git commit -m "feat: voxel Joker, Phoenix Wright and Isabelle"
```

---

### Task 8: Gengar, Oshawott and Reshiram

**Files:**
- Create: `src/world/characters/gengar.ts`, `src/world/characters/oshawott.ts`, `src/world/characters/reshiram.ts`
- Modify: `src/world/characters/index.ts`

**Interfaces:**
- Consumes: `CastMember`, `modelFromBoxes`.
- Produces: `gengar` (id `'gengar'`, which `main.ts` uses to attach the night glow), `oshawott`, `reshiram: CastMember`, added to `cast`.

- [ ] **Step 1: Write the three Pokémon**

`src/world/characters/gengar.ts`:

```ts
import { modelFromBoxes } from '../../lib/voxel/model';
import type { CastMember } from '../cast';

export const gengar: CastMember = {
	id: 'gengar',
	name: 'Gengar',
	position: [24, 22],
	facing: 0,
	idle: { kind: 'wander', radius: 8, hop: false },
	lines: ['Gengar!', 'Heh heh heh…', 'Gen-gar!'],
	source: {
		kind: 'voxels',
		model: modelFromBoxes(
			{ P: '#5a3d8f', D: '#3f2a6b', R: '#e53935', W: '#ffffff' },
			[
				// round body with carved corners
				[2, 2, 2, 11, 11, 8, 'P'],
				[2, 11, 2, 2, 11, 8, '.'],
				[11, 11, 2, 11, 11, 8, '.'],
				[2, 2, 2, 2, 2, 8, '.'],
				[11, 2, 2, 11, 2, 8, '.'],
				// ears, back spikes, arms, feet
				[2, 12, 4, 3, 14, 6, 'P'],
				[10, 12, 4, 11, 14, 6, 'P'],
				[5, 12, 3, 8, 13, 5, 'P'],
				[4, 6, 0, 9, 10, 1, 'P'],
				[0, 5, 4, 1, 7, 6, 'P'],
				[12, 5, 4, 13, 7, 6, 'P'],
				[3, 0, 4, 5, 1, 7, 'P'],
				[8, 0, 4, 10, 1, 7, 'P'],
				// red eyes with angry brows, wide grin
				[3, 9, 9, 5, 9, 9, 'R'],
				[8, 9, 9, 10, 9, 9, 'R'],
				[3, 10, 9, 4, 10, 9, 'D'],
				[9, 10, 9, 10, 10, 9, 'D'],
				[3, 5, 9, 10, 6, 9, 'W'],
				[5, 5, 9, 5, 6, 9, 'D'],
				[8, 5, 9, 8, 6, 9, 'D'],
			],
		),
	},
};
```

`src/world/characters/oshawott.ts`:

```ts
import { modelFromBoxes } from '../../lib/voxel/model';
import type { CastMember } from '../cast';

export const oshawott: CastMember = {
	id: 'oshawott',
	name: 'Oshawott',
	position: [-2, 12],
	facing: 0,
	idle: { kind: 'wander', radius: 6, hop: true },
	lines: ['Osha!', 'Oshawott!', 'Osha osha!'],
	source: {
		kind: 'voxels',
		model: modelFromBoxes(
			{ W: '#f4f6f8', B: '#63b3e8', D: '#2c4f86', E: '#111111', N: '#e8a35b', Y: '#f1d27a' },
			[
				[2, 0, 3, 3, 1, 6, 'D'],
				[6, 0, 3, 7, 1, 6, 'D'],
				[2, 2, 2, 7, 6, 6, 'B'],
				[4, 4, 7, 5, 5, 7, 'Y'], // scalchop
				[1, 4, 3, 1, 5, 5, 'W'],
				[8, 4, 3, 8, 5, 5, 'W'],
				[1, 7, 1, 8, 12, 7, 'W'], // head
				[1, 13, 3, 2, 14, 4, 'W'],
				[7, 13, 3, 8, 14, 4, 'W'],
				[3, 10, 8, 3, 11, 8, 'E'],
				[6, 10, 8, 6, 11, 8, 'E'],
				[4, 9, 8, 5, 9, 8, 'N'],
				[4, 1, 0, 5, 3, 1, 'D'], // tail
			],
		),
	},
};
```

`src/world/characters/reshiram.ts`:

```ts
import { modelFromBoxes } from '../../lib/voxel/model';
import type { CastMember } from '../cast';

export const reshiram: CastMember = {
	id: 'reshiram',
	name: 'Reshiram',
	position: [80, -4],
	facing: -0.4,
	idle: { kind: 'soar' },
	lines: ['Reshiram!', '*a warm, bright roar*', 'Truth lights the way.'],
	source: {
		kind: 'voxels',
		scale: 1.5,
		model: modelFromBoxes(
			{ W: '#f5f5f0', G: '#b9bcc6', U: '#4aa3df' },
			[
				// legs, torso, neck, head, snout
				[11, 0, 9, 13, 8, 12, 'G'],
				[17, 0, 9, 19, 8, 12, 'G'],
				[10, 8, 8, 20, 22, 15, 'W'],
				[12, 23, 11, 18, 28, 15, 'W'],
				[11, 29, 11, 19, 34, 17, 'W'],
				[13, 29, 18, 17, 31, 20, 'W'],
				[12, 32, 18, 12, 32, 18, 'U'],
				[18, 32, 18, 18, 32, 18, 'U'],
				// long mane down the back
				[11, 14, 4, 19, 32, 7, 'W'],
				[12, 10, 3, 18, 14, 5, 'W'],
				// wings with grey tips
				[0, 14, 6, 9, 30, 8, 'W'],
				[21, 14, 6, 30, 30, 8, 'W'],
				[0, 14, 6, 2, 30, 8, 'G'],
				[28, 14, 6, 30, 30, 8, 'G'],
				// turbine tail ring
				[11, 4, 0, 19, 14, 2, 'G'],
				[13, 6, 0, 17, 12, 2, '.'],
			],
		),
	},
};
```

- [ ] **Step 2: Add them to the cast**

`src/world/characters/index.ts`:

```ts
import type { CastMember } from '../cast';
import { gengar } from './gengar';
import { isabelle } from './isabelle';
import { joker } from './joker';
import { minh } from './minh';
import { oshawott } from './oshawott';
import { phoenix } from './phoenix';
import { reshiram } from './reshiram';

export const cast: CastMember[] = [minh, joker, phoenix, isabelle, gengar, oshawott, reshiram];
```

- [ ] **Step 3: Run the cast tests**

Run: `npx vitest run src/world/characters/cast.test.ts`
Expected: PASS for all seven, including both wander paths staying on land. If a wander path fails, move that member's `position` toward the island centre or shrink `radius`. Do not loosen the test.

- [ ] **Step 4: Look at them**

Screenshot `/` in light and dark at about 45% and 100% scroll. Check that:
- Gengar floats and glows purple at night.
- Oshawott hops around near the pond without entering it.
- Reshiram is clearly visible on the cliff when fully scrolled.

- [ ] **Step 5: Commit**

```bash
git add src/world/characters
git commit -m "feat: voxel Gengar, Oshawott and Reshiram"
```

---

### Task 9: Speech bubbles

**Files:**
- Create: `src/world/speech.ts`
- Modify: `src/world/main.ts`
- Test: `src/world/speech.test.ts`

**Interfaces:**
- Consumes: `CastMember` (Task 3); in `main.ts`, the `actors` array and the `render`/`place` closures (Task 6).
- Produces: `HOP_SECONDS = 0.45`, `HOP_HEIGHT = 3`, `hopHeight(elapsed: number): number`, `pickLine(lines: readonly string[], previous: string | null, random?: () => number): string`, `interface SpeechTarget { member: CastMember; object: Object3D }`, `interface Speech { update(): void; dispose(): void }`, `createSpeech(args: { camera: Camera; bubble: HTMLElement; targets: readonly SpeechTarget[]; onPick: (id: string) => void }): Speech`

- [ ] **Step 1: Write the failing tests**

`src/world/speech.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { HOP_HEIGHT, HOP_SECONDS, hopHeight, pickLine } from './speech';

describe('pickLine', () => {
	it('returns the only line, even if it was just said', () => {
		expect(pickLine(['Osha!'], 'Osha!')).toBe('Osha!');
	});

	it('never repeats the previous line when there is a choice', () => {
		let previous: string | null = null;
		let seed = 1;
		const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
		for (let i = 0; i < 200; i++) {
			const line = pickLine(['a', 'b', 'c'], previous, random);
			expect(line).not.toBe(previous);
			previous = line;
		}
	});

	it('stays in range when random() returns its maximum', () => {
		expect(['a', 'b']).toContain(pickLine(['a', 'b'], null, () => 0.9999999999));
	});
});

describe('hopHeight', () => {
	it('is 0 before, at the start of, and after a hop', () => {
		expect(hopHeight(-1)).toBe(0);
		expect(hopHeight(0)).toBe(0);
		expect(hopHeight(HOP_SECONDS + 0.01)).toBe(0);
		expect(hopHeight(Infinity)).toBe(0); // a member that never hopped (hopStart = -Infinity)
	});

	it('peaks halfway through', () => {
		expect(hopHeight(HOP_SECONDS / 2)).toBeCloseTo(HOP_HEIGHT);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/world/speech.test.ts`
Expected: FAIL, `Failed to resolve import "./speech"`.

- [ ] **Step 3: Implement**

`src/world/speech.ts`:

```ts
import { Box3, Raycaster, Vector2, Vector3, type Camera, type Object3D } from 'three';
import type { CastMember } from './cast';

export const HOP_SECONDS = 0.45;
export const HOP_HEIGHT = 3;

/** Height of a click-hop `elapsed` seconds after it began; 0 outside the hop. */
export const hopHeight = (elapsed: number): number =>
	Number.isFinite(elapsed) && elapsed > 0 && elapsed < HOP_SECONDS
		? Math.sin((Math.PI * elapsed) / HOP_SECONDS) * HOP_HEIGHT
		: 0;

/** A random line, never the previous one when there is a choice. */
export const pickLine = (lines: readonly string[], previous: string | null, random: () => number = Math.random): string => {
	const choices = lines.length > 1 ? lines.filter((line) => line !== previous) : lines;
	return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
};

export interface SpeechTarget {
	member: CastMember;
	object: Object3D;
}

export interface Speech {
	/** Re-positions an open bubble over its speaker; call after each render. */
	update(): void;
	dispose(): void;
}

/** Clicks on these never reach the World: content always wins. */
const SOLID = 'a, button, input, select, textarea, label, header, [data-world-solid]';

export const createSpeech = ({
	camera,
	bubble,
	targets,
	onPick,
}: {
	camera: Camera;
	bubble: HTMLElement;
	targets: readonly SpeechTarget[];
	onPick: (id: string) => void;
}): Speech => {
	const raycaster = new Raycaster();
	const pointer = new Vector2();
	const head = new Vector3();
	const bounds = new Box3();
	const said = new Map<string, string>();
	let speaker: SpeechTarget | null = null;

	const update = () => {
		if (!speaker) return;
		bounds.setFromObject(speaker.object);
		bounds.getCenter(head);
		head.y = bounds.max.y;
		head.project(camera);
		if (head.z > 1) {
			bubble.style.visibility = 'hidden';
			return;
		}
		bubble.style.visibility = '';
		const x = ((head.x + 1) / 2) * window.innerWidth;
		const y = ((1 - head.y) / 2) * window.innerHeight;
		bubble.style.transform = `translate(${x}px, ${y}px) translate(-50%, calc(-100% - 12px))`;
	};

	const close = () => {
		speaker = null;
		bubble.hidden = true;
	};

	const open = (target: SpeechTarget) => {
		const line = pickLine(target.member.lines, said.get(target.member.id) ?? null);
		said.set(target.member.id, line);
		const name = document.createElement('strong');
		name.textContent = target.member.name;
		bubble.replaceChildren(name, document.createTextNode(` ${line}`));
		bubble.hidden = false;
		speaker = target;
		onPick(target.member.id);
		update();
	};

	const speakerOf = (hit: Object3D) => {
		for (let node: Object3D | null = hit; node; node = node.parent) {
			const target = targets.find((t) => t.object === node);
			if (target) return target;
		}
		return null;
	};

	// `click`, not `pointerdown`: a finger drag that starts on a character must scroll, not talk.
	const onClick = (event: MouseEvent) => {
		if (event.target instanceof Element && event.target.closest(SOLID)) return;
		pointer.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
		raycaster.setFromCamera(pointer, camera);
		const [hit] = raycaster.intersectObjects(
			targets.map((t) => t.object),
			true,
		);
		const target = hit ? speakerOf(hit.object) : null;
		if (target) open(target);
		else close();
	};

	const onKeyDown = (event: KeyboardEvent) => {
		if (event.key === 'Escape') close();
	};

	document.addEventListener('click', onClick);
	document.addEventListener('keydown', onKeyDown);
	return {
		update,
		dispose: () => {
			document.removeEventListener('click', onClick);
			document.removeEventListener('keydown', onKeyDown);
			close();
		},
	};
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/world/speech.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Wire speech and the hop into `main.ts`**

In `src/world/main.ts` (rename `_bubble` back to `bubble` if you renamed it in Task 6):

1. Add the import: `import { createSpeech, hopHeight } from './speech';`
2. In `place`, replace `actor.object.position.set(x, ground + pose.dy, z);` with:

```ts
		const hop = options.reducedMotion ? 0 : hopHeight(t - actor.hopStart);
		actor.object.position.set(x, ground + pose.dy + hop, z);
```

3. Replace `const render = () => renderer.render(scene, camera);` with:

```ts
	const speech = createSpeech({
		camera,
		bubble,
		targets: actors.map(({ member, object }) => ({ member, object })),
		onPick: (id) => {
			const actor = actors.find((a) => a.member.id === id);
			if (actor) actor.hopStart = (performance.now() - start) / 1000;
			if (options.reducedMotion) render();
		},
	});
	const render = () => {
		renderer.render(scene, camera);
		speech.update();
	};
```

and move `const start = performance.now();` to just above `const speech = createSpeech(...)` (`onPick` reads `start`; `let last = start;` stays where it is).

4. In the returned stop function, add `speech.dispose();` right after `stopTheme();`.

- [ ] **Step 6: Gates**

Run: `npm test && npx astro check && npx astro build`
Expected: PASS; `0 errors`; `Complete!`.

- [ ] **Step 7: Browser check of bubbles**

In the scratchpad Playwright script, on `/`:
- Project Minh's on-screen position and click there: `page.mouse.click(x, y)`. Find the position by trying the canvas centre-left at progress 0, or temporarily log `head` in `update`. Expect `[data-world-speech]` to be visible and to contain `Minh`.
- Press Escape and expect the bubble hidden.
- Click the Projects window and expect navigation to `/projects/`.
- Back on `/`, dispatch a bare pointerdown over Minh: `page.dispatchEvent('main', 'pointerdown', { clientX: x, clientY: y })`. Expect the bubble to stay hidden (Review Focus: touch scroll).
- With `reducedMotion: 'reduce'` in the context options, click Minh and expect the bubble to appear.

- [ ] **Step 8: Commit**

```bash
git add src/world/speech.ts src/world/speech.test.ts src/world/main.ts
git commit -m "feat: click a Cast Member for a hop and a speech bubble"
```

---

### Task 10: Verification pass, polish and learning doc

**Files:**
- Create: `docs/learning/08-voxel-world.md`
- Modify (only if a check below fails): `src/world/main.ts`, `src/world/camera-path.ts`, `src/pages/index.astro`

**Interfaces:**
- Consumes: the finished World.
- Produces: verified behaviour and the learning doc.

- [ ] **Step 1: Write the verification script in the scratchpad**

Create `<scratchpad>/pw/world-check.mjs`. Playwright is already installed in `<scratchpad>/pw`. If it isn't, run `npm i playwright@1.56` there.

```js
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:4321';
const browser = await chromium.launch({ channel: 'chrome' });
const report = (label, ok, detail = '') => console.log(`${ok ? 'PASS' : 'FAIL'} ${label} ${detail}`);

// 1. Start/stop across 10 round trips, no leaked Worlds.
{
	const page = await browser.newPage();
	await page.goto(base + '/');
	await page.waitForFunction(() => document.documentElement.dataset.world);
	for (let i = 0; i < 10; i++) {
		await page.click('nav a:has-text("Projects")');
		await page.waitForURL('**/projects/');
		await page.click('nav a:has-text("Home")');
		await page.waitForFunction(() => document.documentElement.dataset.world);
	}
	const marks = await page.evaluate(() => ({
		starts: performance.getEntriesByName('world:start').length,
		stops: performance.getEntriesByName('world:stop').length,
	}));
	report('round trips', marks.starts === 11 && marks.stops === 10, JSON.stringify(marks));
	await page.close();
}

// 2. Leaving / before the World finishes loading leaves nothing running.
{
	const page = await browser.newPage();
	await page.goto(base + '/');
	await page.click('nav a:has-text("Projects")');
	await page.waitForTimeout(3000);
	const marks = await page.evaluate(() => ({
		starts: performance.getEntriesByName('world:start').length,
		stops: performance.getEntriesByName('world:stop').length,
		world: document.documentElement.dataset.world ?? null,
	}));
	report('early exit', marks.starts === marks.stops && marks.world === null, JSON.stringify(marks));
	await page.close();
}

// 3. three.js is fetched only on /.
{
	const page = await browser.newPage();
	const scripts = [];
	page.on('request', (r) => r.resourceType() === 'script' && scripts.push(r.url()));
	await page.goto(base + '/projects/');
	await page.waitForTimeout(1500);
	report('no world code off /', !scripts.some((u) => /three|world|main/i.test(u)), scripts.join(' '));
	await page.close();
}

// 4. Fallback when WebGL is blocked.
{
	const page = await browser.newPage();
	await page.addInitScript(() => {
		const original = HTMLCanvasElement.prototype.getContext;
		HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
			return /webgl/.test(type) ? null : original.call(this, type, ...rest);
		};
	});
	await page.goto(base + '/');
	await page.waitForTimeout(2000);
	const state = await page.evaluate(() => ({
		world: document.documentElement.dataset.world ?? null,
		gradient: getComputedStyle(document.querySelector('.world')).backgroundImage,
	}));
	report('no-WebGL fallback', state.world === null && state.gradient.includes('gradient'), JSON.stringify(state));
	await page.close();
}

// 5. Reduced motion renders still and hides the runway.
{
	const context = await browser.newContext({ reducedMotion: 'reduce' });
	const page = await context.newPage();
	await page.goto(base + '/');
	await page.waitForFunction(() => document.documentElement.dataset.world);
	const state = await page.evaluate(() => ({
		world: document.documentElement.dataset.world,
		runway: getComputedStyle(document.querySelector('.runway')).display,
	}));
	report('reduced motion', state.world === 'still' && state.runway === 'none', JSON.stringify(state));
	await context.close();
}

// 6. Frame time sample.
{
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
	await page.goto(base + '/');
	await page.waitForFunction(() => document.documentElement.dataset.world);
	const fps = await page.evaluate(
		() =>
			new Promise((resolve) => {
				let frames = 0;
				const t0 = performance.now();
				const step = () => (++frames, performance.now() - t0 < 2000 ? requestAnimationFrame(step) : resolve(frames / 2));
				requestAnimationFrame(step);
			}),
	);
	report('fps', fps >= 50, `${fps.toFixed(1)} fps (headless; informational)`);
	await page.close();
}

await browser.close();
```

- [ ] **Step 2: Run it against a production build**

Run: `npx astro build && npx astro preview --port 4322` (in the background), then `node <scratchpad>/pw/world-check.mjs http://localhost:4322`.
Expected: every line `PASS`. The headless fps number is informational: below 50 is worth a look, but it's not a hard failure in headless Chrome. Stop the preview server afterwards.

- [ ] **Step 3: Fix anything that failed**

Apply the smallest fix in the owning file. Common cases:
- `round trips` start/stop counts off → `astro:before-swap` didn't run `stop`, or a start resolved after the swap without the `isConnected` guard.
- `no world code off /` → something outside `World.astro` imports `src/world`.

Re-run Step 2 until every check passes.

- [ ] **Step 4: Screenshots for the owner**

Screenshot `/` at 1280×900 and 390×844, in light and dark, at 0%, 50% and 100% scroll. Save them to the scratchpad and review them. Check that:
- Text is readable everywhere.
- No character sits under the intro card at 0%.
- Reshiram is framed at 100%.
- On a phone, the bubble stays inside the viewport. If it doesn't, clamp `x` in `speech.ts` `update` to `[8 + bubble.offsetWidth / 2, innerWidth − 8 − bubble.offsetWidth / 2]`.

- [ ] **Step 5: Write the learning doc**

`docs/learning/08-voxel-world.md`:

```markdown
# 08 — Voxel World

## What we built

- A full-screen three.js World behind the homepage: a voxel island with a café, courthouse, town hall, trees, a pond and a cliff, populated by seven Cast Members (Minh, Joker, Phoenix Wright, Isabelle, Gengar, Oshawott, Reshiram).
- Scrolling moves the camera along a curve from Minh to Reshiram's cliff; light mode is day, dark mode is night (stars, glowing windows, a purple glow on Gengar).
- Clicking a Cast Member makes it hop and shows a speech bubble; Esc or clicking elsewhere closes it.
- Fallbacks: a CSS gradient without WebGL or JavaScript, and a single still frame with `prefers-reduced-motion`.

## Key concepts

### Voxel models as text
Each model is a palette plus layer grids (`layers[y][z][x]`), or boxes painted into that grid with `modelFromBoxes`. Keeping models as data means they are diffable, tested (every Cast Member must parse and stand on land), and independent of three.js.

### Face culling and merged geometry
A voxel face is drawn only if no voxel sits next to it (`visibleFaces`). All visible faces of a model go into one `BufferGeometry` with per-vertex colours, so each character is a single draw call instead of hundreds of cubes.

### Pure core, thin three.js shell
Terrain, camera path, idle poses and line picking are plain functions with Vitest tests. The three.js files only turn their results into meshes and positions. Most bugs show up in unit tests rather than in a browser.

### Catmull-Rom camera path
`cameraAt(progress)` interpolates through a handful of key camera positions with a Catmull-Rom spline, which passes through every key and has no corners. Scroll progress is eased toward each frame so the camera glides instead of snapping.

### Lifecycle under ClientRouter
With client-side navigation, a page's scripts don't rerun on each visit. `World.astro` starts the World on `astro:page-load` (only if the canvas exists) and stops it on `astro:before-swap`. Stopping disposes every geometry and material and forces the WebGL context to be released. three.js is behind a dynamic `import()`, so other pages never download it.

### The upgrade seam
`loadCharacter(source)` is the only place that turns a `CharacterSource` into a 3D object. Adding MagicaVoxel `.vox` files later means adding one union member and one `case`; the scene code doesn't change.
```

- [ ] **Step 6: Final gates and commit**

Run: `npm test && npx astro check && npx astro build`
Expected: PASS; `0 errors`; `Complete!`.

```bash
git add docs/learning/08-voxel-world.md src
git commit -m "docs: voxel World learning notes; verification fixes"
```
