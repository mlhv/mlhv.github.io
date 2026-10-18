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
