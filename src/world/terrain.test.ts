import { describe, expect, it } from 'vitest';
import { BLOCK, GRID_D, GRID_W, isLand, surfaceY, terrainAt } from './terrain';

describe('terrainAt', () => {
	it('is grass at the island centre, one block high', () => {
		expect(terrainAt(24, 12)).toEqual({ height: 1, surface: 'grass' });
	});

	it('is a path along the middle rows', () => {
		expect(terrainAt(24, 15)).toEqual({ height: 1, surface: 'path' });
	});

	it('is sea outside the grid and past the island edge', () => {
		expect(terrainAt(-1, 0).surface).toBe('sea');
		expect(terrainAt(GRID_W, 0).surface).toBe('sea');
		expect(terrainAt(0, 0)).toEqual({ height: 0, surface: 'sea' });
	});

	it('has a five-block cliff at the east end', () => {
		expect(terrainAt(44, 14)).toEqual({ height: 5, surface: 'cliff' });
	});

	it('has a sunken pond', () => {
		expect(terrainAt(20, 20)).toEqual({ height: 0, surface: 'pond' });
	});

	it('rings the island with sand', () => {
		expect(terrainAt(24, GRID_D - 2).surface).toBe('sand');
	});
});

describe('surfaceY / isLand', () => {
	it('converts world coordinates to the block top', () => {
		expect(surfaceY(0, -10)).toBe(1 * BLOCK);
		expect(surfaceY(80, -4)).toBe(5 * BLOCK);
		expect(surfaceY(-500, 0)).toBe(0);
	});

	it('treats sea and pond as not land', () => {
		expect(isLand(0, -10)).toBe(true);
		expect(isLand(-500, 0)).toBe(false);
		expect(isLand(-14, 22)).toBe(false);
	});
});
