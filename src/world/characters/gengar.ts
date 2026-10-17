import { modelFromBoxes } from '../../lib/voxel/model';
import type { CastMember } from '../cast';

export const gengar: CastMember = {
	id: 'gengar',
	name: 'Gengar',
	position: [24, 22],
	facing: 0,
	idle: { kind: 'wander', radius: 8, hop: false },
	lines: ['Gengar!', 'Heh heh heh…', 'Gen-gar!'],
	source: {
		kind: 'voxels',
		model: modelFromBoxes(
			{ P: '#5a3d8f', D: '#3f2a6b', R: '#e53935', W: '#ffffff' },
			[
				// round body with carved corners
				[2, 2, 2, 11, 11, 8, 'P'],
				[2, 11, 2, 2, 11, 8, '.'],
				[11, 11, 2, 11, 11, 8, '.'],
				[2, 2, 2, 2, 2, 8, '.'],
				[11, 2, 2, 11, 2, 8, '.'],
				// ears, back spikes, arms, feet
				[2, 12, 4, 3, 14, 6, 'P'],
				[10, 12, 4, 11, 14, 6, 'P'],
				[5, 12, 3, 8, 13, 5, 'P'],
				[4, 6, 0, 9, 10, 1, 'P'],
				[0, 5, 4, 1, 7, 6, 'P'],
				[12, 5, 4, 13, 7, 6, 'P'],
				[3, 0, 4, 5, 1, 7, 'P'],
				[8, 0, 4, 10, 1, 7, 'P'],
				// red eyes with angry brows, wide grin
				[3, 9, 9, 5, 9, 9, 'R'],
				[8, 9, 9, 10, 9, 9, 'R'],
				[3, 10, 9, 4, 10, 9, 'D'],
				[9, 10, 9, 10, 10, 9, 'D'],
				[3, 5, 9, 10, 6, 9, 'W'],
				[5, 5, 9, 5, 6, 9, 'D'],
				[8, 5, 9, 8, 6, 9, 'D'],
			],
		),
	},
};
