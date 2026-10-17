import { modelFromBoxes } from '../../lib/voxel/model';
import type { CastMember } from '../cast';
import { humanoidBoxes } from './humanoid';

export const joker: CastMember = {
	id: 'joker',
	name: 'Joker',
	position: [6, -6],
	facing: 0.3,
	idle: { kind: 'bob' },
	lines: ['…', "Leblanc's coffee is the best in town.", 'Take your time.'],
	source: {
		kind: 'voxels',
		model: modelFromBoxes(
			{
				K: '#f1d7bd',
				H: '#141414',
				T: '#1e1e24', // coat
				B: '#2b2b33',
				S: '#4a2c1a',
				E: '#111111',
				R: '#d0182b', // gloves
				W: '#f5f5f5', // mask
			},
			[
				...humanoidBoxes(),
				// messy hair and bangs
				[0, 14, 3, 9, 16, 8, 'H'],
				[1, 13, 9, 2, 15, 9, 'H'],
				[6, 14, 9, 8, 15, 9, 'H'],
				// coat tails and open front, high collar
				[2, 3, 3, 7, 5, 4, 'T'],
				[2, 3, 7, 3, 5, 7, 'T'],
				[6, 3, 7, 7, 5, 7, 'T'],
				[2, 10, 3, 7, 11, 4, 'T'],
				// red gloves
				[0, 6, 5, 1, 7, 6, 'R'],
				[8, 6, 5, 9, 7, 6, 'R'],
				// mask with eye holes
				[2, 13, 9, 7, 14, 9, 'W'],
				[3, 13, 9, 3, 13, 9, 'E'],
				[6, 13, 9, 6, 13, 9, 'E'],
			],
		),
	},
};
