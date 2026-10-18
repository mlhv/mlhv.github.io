import { describe, expect, it } from 'vitest';
import { focusStep } from './focus-step';

describe('focusStep', () => {
	it('prefers the focused element’s Step while it is inside the viewport', () => {
		expect(focusStep(2, { top: 100, bottom: 130 }, 900, 1)).toBe(2);
	});

	it('falls back when the focused element is above, below or straddling the viewport edge', () => {
		expect(focusStep(2, { top: -50, bottom: -20 }, 900, 1)).toBe(1);
		expect(focusStep(2, { top: 920, bottom: 950 }, 900, 1)).toBe(1);
		expect(focusStep(2, { top: 880, bottom: 910 }, 900, 1)).toBe(1);
	});

	it('falls back when the focus is in no Step', () => {
		expect(focusStep(-1, { top: 100, bottom: 130 }, 900, 1)).toBe(1);
	});
});
