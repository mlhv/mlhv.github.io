import { modelFromBoxes } from '../../lib/voxel/model';
import type { CastMember } from '../cast';

export const oshawott: CastMember = {
	id: 'oshawott',
	name: 'Oshawott',
	position: [-2, 12],
	facing: 0,
	idle: { kind: 'wander', radius: 6, hop: true },
	lines: ['Osha!', 'Oshawott!', 'Osha osha!'],
	source: {
		kind: 'voxels',
		model: modelFromBoxes(
			{ W: '#f4f6f8', B: '#63b3e8', D: '#2c4f86', E: '#111111', N: '#e8a35b', Y: '#f1d27a' },
			[
				[2, 0, 3, 3, 1, 6, 'D'],
				[6, 0, 3, 7, 1, 6, 'D'],
				[2, 2, 2, 7, 6, 6, 'B'],
				[4, 4, 7, 5, 5, 7, 'Y'], // scalchop
				[1, 4, 3, 1, 5, 5, 'W'],
				[8, 4, 3, 8, 5, 5, 'W'],
				[1, 7, 1, 8, 12, 7, 'W'], // head
				[1, 13, 3, 2, 14, 4, 'W'],
				[7, 13, 3, 8, 14, 4, 'W'],
				[3, 10, 8, 3, 11, 8, 'E'],
				[6, 10, 8, 6, 11, 8, 'E'],
				[4, 9, 8, 5, 9, 8, 'N'],
				[4, 1, 0, 5, 3, 1, 'D'], // tail
			],
		),
	},
};
