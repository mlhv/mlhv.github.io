import { describe, expect, it } from 'vitest';
import { STEPS, isStepId, kicker, stageSteps, stepFromHash } from './steps';

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

describe('stageSteps', () => {
	it('drops the Blog Step while there are no posts', () => {
		expect(stageSteps(0).map((s) => s.id)).toEqual(['hello', 'work', 'projects', 'contact']);
	});

	it('keeps every Step once there is a post', () => {
		expect(stageSteps(1)).toEqual(STEPS);
	});
});

describe('kicker', () => {
	it('numbers from 01 with the label', () => {
		expect(kicker(STEPS, 'hello')).toBe('01 · Hello');
		expect(kicker(STEPS, 'work')).toBe('02 · Work Experience');
		expect(kicker(STEPS, 'contact')).toBe('05 · Contact');
	});

	it('numbers by position in the Steps shown, leaving no gap for a hidden Step', () => {
		expect(kicker(stageSteps(0), 'contact')).toBe('04 · Contact');
	});
});
