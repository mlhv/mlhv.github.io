import { modelFromBoxes } from '../../lib/voxel/model';
import type { CastMember } from '../cast';
import { humanoidBoxes } from './humanoid';

export const minh: CastMember = {
	id: 'minh',
	name: 'Minh',
	position: [-60, 12],
	facing: 0.2,
	idle: { kind: 'bob' },
	lines: [
		"Hi, I'm Minh! Grab a matcha. I'm looking for a Summer 2027 internship.",
		"Currently building backend, infra, and applied-AI things.",
		'Keep scrolling. Someone big is waiting on the cliff.',
	],
	source: {
		kind: 'voxels',
		model: modelFromBoxes(
			{
				K: '#f3d9b8', // skin
				H: '#141414', // black hair (top)
				h: '#3a3a3a', // two-block shaved sides
				T: '#f1f1f1', // tee
				B: '#8a8f98', // sweatpants
				S: '#fafafa', // sneakers
				E: '#1b1b1b',
				G: '#c9ccd1', // silver glasses frame
				L: '#2a2f36', // lenses
				C: '#d9dde3', // silver chain and ring
				W: '#b07a4f', // table
				P: '#a7adb7', // laptop
				M: '#9cc25b', // iced matcha
				s: '#2f6b3a', // straw
			},
			[
				...humanoidBoxes(),
				// two-block: fuller top with a fringe, short darker sides
				[1, 16, 3, 8, 16, 8, 'H'],
				[2, 15, 9, 7, 15, 9, 'H'],
				[1, 12, 4, 1, 14, 7, 'h'],
				[8, 12, 4, 8, 14, 7, 'h'],
				// glasses
				[2, 13, 9, 7, 13, 9, 'G'],
				[3, 13, 9, 3, 13, 9, 'L'],
				[6, 13, 9, 6, 13, 9, 'L'],
				// silver chain, pendant, ring
				[3, 10, 8, 6, 10, 8, 'C'],
				[4, 9, 8, 5, 9, 8, 'C'],
				[9, 6, 7, 9, 6, 7, 'C'],
				// low table with laptop and iced matcha
				[12, 0, 4, 17, 3, 8, 'W'],
				[12, 4, 5, 15, 4, 8, 'P'],
				[12, 5, 5, 15, 8, 5, 'P'],
				[16, 4, 6, 17, 6, 7, 'M'],
				[17, 7, 6, 17, 8, 6, 's'],
			],
		),
	},
};
