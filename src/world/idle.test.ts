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
