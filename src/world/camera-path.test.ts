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
