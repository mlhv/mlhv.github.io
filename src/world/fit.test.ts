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
