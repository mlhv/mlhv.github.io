import { modelFromBoxes } from '../../lib/voxel/model';
import type { CastMember } from '../cast';
import { humanoidBoxes } from './humanoid';

export const phoenix: CastMember = {
	id: 'phoenix',
	name: 'Phoenix Wright',
	position: [-34, -8],
	facing: -0.15,
	idle: { kind: 'bob' },
	lines: ['Objection!', "Hold it! Have you seen Minh's résumé?", 'Take that!'],
	source: {
		kind: 'voxels',
		model: modelFromBoxes(
			{
				K: '#f1d1b0',
				H: '#121212',
				T: '#2849a8', // blue suit
				B: '#2849a8',
				S: '#3b2a1a',
				E: '#111111',
				W: '#ffffff', // shirt
				R: '#c62828', // tie
				Y: '#e0b84a', // badge
			},
			[
				...humanoidBoxes(),
				// shirt V, tie, badge
				[3, 9, 8, 6, 10, 8, 'W'],
				[4, 6, 8, 4, 9, 8, 'R'],
				[6, 8, 8, 6, 8, 8, 'Y'],
				// signature spikes: a raised base plus three tall gapped prongs, swept back
				[1, 16, 3, 8, 16, 8, 'H'],
				[1, 17, 4, 2, 19, 8, 'H'],
				[4, 17, 4, 5, 21, 8, 'H'],
				[7, 17, 4, 8, 19, 8, 'H'],
				[2, 18, 2, 7, 18, 3, 'H'],
				[3, 19, 1, 6, 19, 2, 'H'],
				// fringe over the forehead
				[2, 15, 9, 7, 15, 9, 'H'],
			],
		),
	},
};
