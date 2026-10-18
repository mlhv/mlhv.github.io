import { describe, expect, it } from 'vitest';
import { standInShape } from './stand-in';

describe('standInShape', () => {
	it.each([1, 17, 50])('fills exactly %s units with its base on the ground', (height) => {
		const { radius, length, centerY } = standInShape(height);
		expect(radius).toBeGreaterThan(0);
		expect(length).toBeGreaterThan(0);
		expect(2 * radius + length).toBeCloseTo(height, 9);
		expect(centerY).toBeCloseTo(height / 2, 9);
	});
});
