import { describe, expect, it } from 'vitest';
import { parseVoxelModel } from '../lib/voxel/model';
import { cafe, courthouse, PLACEMENTS, type Building } from './buildings';
import { isLand } from './terrain';

describe('PLACEMENTS', () => {
	it.each(PLACEMENTS.map((p, i) => [i, p] as const))('placement %i parses and its origin is on land', (_, placement) => {
		expect(parseVoxelModel(placement.building.model).length).toBeGreaterThan(0);
		if (placement.building.windows) expect(parseVoxelModel(placement.building.windows).length).toBeGreaterThan(0);
		expect(isLand(...placement.at)).toBe(true);
	});
});

describe('town layout', () => {
	it('puts the courthouse west of the cafe', () => {
		const x = (building: Building) => PLACEMENTS.find((p) => p.building === building)?.at[0] ?? NaN;
		expect(x(courthouse)).toBeLessThan(x(cafe));
	});
});
