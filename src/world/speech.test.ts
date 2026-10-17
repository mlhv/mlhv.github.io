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
