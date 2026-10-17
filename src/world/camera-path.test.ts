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
