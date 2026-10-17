import { describe, expect, it } from 'vitest';
import { composite, contrastRatio, parseHex } from './contrast';

describe('contrast', () => {
	it('parses 6-digit hex with or without #', () => {
		expect(parseHex('#1f7a45')).toEqual([31, 122, 69]);
		expect(parseHex('FFFFFF')).toEqual([255, 255, 255]);
		expect(() => parseHex('#fff')).toThrow('6-digit');
	});

	it('matches the WCAG reference ratios', () => {
		expect(contrastRatio([255, 255, 255], [0, 0, 0])).toBeCloseTo(21, 5);
		expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
		expect(contrastRatio([10, 20, 30], [10, 20, 30])).toBe(1);
		expect(contrastRatio(parseHex('#767676'), [255, 255, 255])).toBeCloseTo(4.54, 2);
	});

	it('composites a translucent colour over a background', () => {
		expect(composite([0, 0, 0], 0.5, [255, 255, 255])).toEqual([128, 128, 128]);
		expect(composite([14, 22, 20], 1, [255, 255, 255])).toEqual([14, 22, 20]);
	});
});
