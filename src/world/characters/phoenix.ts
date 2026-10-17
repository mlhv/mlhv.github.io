import { modelFromBoxes } from '../../lib/voxel/model';
import type { CastMember } from '../cast';
import { humanoidBoxes } from './humanoid';

export const phoenix: CastMember = {
	id: 'phoenix',
	name: 'Phoenix Wright',
	position: [8, -8],
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
				// signature spikes sweeping back and up
				[1, 16, 3, 8, 16, 7, 'H'],
				[2, 17, 2, 6, 17, 5, 'H'],
				[2, 13, 1, 7, 15, 2, 'H'],
				[3, 14, 0, 6, 15, 0, 'H'],
			],
		),
	},
};
