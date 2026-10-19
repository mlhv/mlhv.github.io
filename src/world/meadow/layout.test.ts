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
