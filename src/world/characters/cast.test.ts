import { describe, expect, it } from 'vitest';
import { parseVoxelModel } from '../../lib/voxel/model';
import { idlePose, WANDER_SPEED } from '../idle';
import { isLand } from '../terrain';
import { cast } from './index';

describe('cast', () => {
	it('has unique ids', () => {
		const ids = cast.map((m) => m.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it.each(cast.map((m) => [m.id, m] as const))('%s parses, has lines, and stands on land', (_, member) => {
		expect(parseVoxelModel(member.source.model).length).toBeGreaterThan(0);
		expect(member.lines.length).toBeGreaterThan(0);
		expect(member.name.trim()).not.toBe('');
		const [x, z] = member.position;
		expect(isLand(x, z)).toBe(true);
	});

	it.each(cast.filter((m) => m.idle.kind === 'wander').map((m) => [m.id, m] as const))(
		'%s never wanders into water',
		(_, member) => {
			const [x, z] = member.position;
			const period = (2 * Math.PI) / WANDER_SPEED;
			for (let i = 0; i < 200; i++) {
				const { dx, dz } = idlePose(member.idle, (i / 200) * period, 0);
				expect(isLand(x + dx, z + dz)).toBe(true);
			}
		},
	);
});
