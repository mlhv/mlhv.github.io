import { modelFromBoxes } from '../../lib/voxel/model';
import type { CastMember } from '../cast';
import { humanoidBoxes } from './humanoid';

export const isabelle: CastMember = {
	id: 'isabelle',
	name: 'Isabelle',
	position: [40, -6],
	facing: -0.3,
	idle: { kind: 'bob' },
	lines: [
		"Good morning! Today's announcement: Minh shipped a new project!",
		'Please enjoy your stay on the island!',
		'Remember to drink some water today!',
	],
	source: {
		kind: 'voxels',
		model: modelFromBoxes(
			{
				K: '#f6e3a1', // fur
				H: '#f6e3a1',
				D: '#d9b85c', // darker ear fur
				T: '#4f9d4f', // green vest
				B: '#c94a3c', // skirt
				S: '#f6e3a1',
				E: '#111111',
				N: '#1b1b1b', // nose
				R: '#d84545', // hair tie
				W: '#ffffff', // collar
			},
			[
				...humanoidBoxes(),
				// floppy ears
				[0, 10, 4, 1, 14, 9, 'D'],
				[8, 10, 4, 9, 14, 9, 'D'],
				// top tuft with red tie
				[4, 16, 5, 5, 17, 6, 'H'],
				[4, 16, 5, 5, 16, 6, 'R'],
				// nose, collar, skirt
				[4, 12, 9, 5, 12, 9, 'N'],
				[3, 10, 8, 6, 10, 8, 'W'],
				[1, 3, 3, 8, 5, 8, 'B'],
			],
		),
	},
};
