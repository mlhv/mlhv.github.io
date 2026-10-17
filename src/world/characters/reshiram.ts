import { modelFromBoxes } from '../../lib/voxel/model';
import type { CastMember } from '../cast';

export const reshiram: CastMember = {
	id: 'reshiram',
	name: 'Reshiram',
	position: [74, -4],
	facing: -0.4,
	idle: { kind: 'soar' },
	lines: ['Reshiram!', '*a warm, bright roar*', 'Truth lights the way.'],
	source: {
		kind: 'voxels',
		scale: 1.5,
		model: modelFromBoxes(
			{ W: '#f5f5f0', G: '#b9bcc6', U: '#4aa3df' },
			[
				// legs, torso, neck, head, snout
				[11, 0, 9, 13, 8, 12, 'G'],
				[17, 0, 9, 19, 8, 12, 'G'],
				[10, 8, 8, 20, 22, 15, 'W'],
				[12, 23, 11, 18, 28, 15, 'W'],
				[11, 29, 11, 19, 34, 17, 'W'],
				[13, 29, 18, 17, 31, 20, 'W'],
				[12, 32, 18, 12, 32, 18, 'U'],
				[18, 32, 18, 18, 32, 18, 'U'],
				// long mane down the back
				[11, 14, 4, 19, 32, 7, 'W'],
				[12, 10, 3, 18, 14, 5, 'W'],
				// wings with grey tips
				[0, 14, 6, 9, 30, 8, 'W'],
				[21, 14, 6, 30, 30, 8, 'W'],
				[0, 14, 6, 2, 30, 8, 'G'],
				[28, 14, 6, 30, 30, 8, 'G'],
				// turbine tail ring
				[11, 4, 0, 19, 14, 2, 'G'],
				[13, 6, 0, 17, 12, 2, '.'],
			],
		),
	},
};
