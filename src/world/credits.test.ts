import { describe, expect, it } from 'vitest';
import type { Credit } from './cast';
import { creditLines } from './credits';

const credit = (title: string): Credit => ({ title, author: 'Someone', licence: 'CC BY 4.0', url: `https://example.com/${title}` });

describe('creditLines', () => {
	it('is empty while nobody has a model', () => {
		expect(creditLines([{ credit: null }, { credit: null }])).toEqual([]);
	});

	it('lists credits in cast order, skipping members without one', () => {
		const lines = creditLines([{ credit: credit('b') }, { credit: null }, { credit: credit('a') }]);
		expect(lines.map((c) => c.title)).toEqual(['b', 'a']);
	});
});
