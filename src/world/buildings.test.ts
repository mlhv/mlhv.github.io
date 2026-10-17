import { describe, expect, it } from 'vitest';
import { parseVoxelModel } from '../lib/voxel/model';
import { PLACEMENTS } from './buildings';
import { isLand } from './terrain';

describe('PLACEMENTS', () => {
	it.each(PLACEMENTS.map((p, i) => [i, p] as const))('placement %i parses and its origin is on land', (_, placement) => {
		expect(parseVoxelModel(placement.building.model).length).toBeGreaterThan(0);
		if (placement.building.windows) expect(parseVoxelModel(placement.building.windows).length).toBeGreaterThan(0);
		expect(isLand(...placement.at)).toBe(true);
	});
});
