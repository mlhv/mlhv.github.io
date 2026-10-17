import { describe, expect, it } from 'vitest';
import { STEPS, isStepId, kicker, stepFromHash } from './steps';

describe('STEPS', () => {
	it('is the spec order', () => {
		expect(STEPS.map((s) => s.id)).toEqual(['hello', 'work', 'projects', 'blog', 'contact']);
	});
});

describe('isStepId', () => {
	it('accepts step ids only', () => {
		expect(isStepId('projects')).toBe(true);
		expect(isStepId('main')).toBe(false);
		expect(isStepId(undefined)).toBe(false);
		expect(isStepId(3)).toBe(false);
	});
});

describe('stepFromHash', () => {
	it('reads a step hash with or without the #', () => {
		expect(stepFromHash('#work')).toBe('work');
		expect(stepFromHash('contact')).toBe('contact');
	});

	it('falls back to hello for empty, foreign, or wrongly cased hashes', () => {
		expect(stepFromHash('')).toBe('hello');
		expect(stepFromHash('#')).toBe('hello');
		expect(stepFromHash('#main')).toBe('hello'); // the skip link
		expect(stepFromHash('#Projects')).toBe('hello');
	});
});

describe('kicker', () => {
	it('numbers from 01 with the label', () => {
		expect(kicker(0)).toBe('01 · Hello');
		expect(kicker(1)).toBe('02 · Work Experience');
		expect(kicker(4)).toBe('05 · Contact');
	});
});
