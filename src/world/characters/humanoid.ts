import type { Box } from '../../lib/voxel/model';

/**
 * A chibi body about 16 voxels tall: x 0–9, y 0–15, body z 3–8 (front face at z = 8, front details at z = 9),
 * leaving z 0–2 free behind for hair or tails. Palette keys: K skin, H hair, T top, B bottom, S shoes, E eyes.
 */
export const humanoidBoxes = (): Box[] => [
	// shoes and legs
	[2, 0, 4, 3, 0, 7, 'S'],
	[6, 0, 4, 7, 0, 7, 'S'],
	[2, 1, 5, 3, 5, 6, 'B'],
	[6, 1, 5, 7, 5, 6, 'B'],
	// torso, sleeves, hands
	[2, 6, 4, 7, 10, 7, 'T'],
	[0, 8, 5, 1, 10, 6, 'T'],
	[8, 8, 5, 9, 10, 6, 'T'],
	[0, 6, 5, 1, 7, 6, 'K'],
	[8, 6, 5, 9, 7, 6, 'K'],
	// head, hair cap, back of hair, sides
	[1, 11, 3, 8, 15, 8, 'K'],
	[1, 15, 3, 8, 15, 8, 'H'],
	[1, 11, 3, 8, 15, 3, 'H'],
	[1, 13, 3, 1, 15, 7, 'H'],
	[8, 13, 3, 8, 15, 7, 'H'],
	// eyes
	[3, 13, 8, 3, 13, 8, 'E'],
	[6, 13, 8, 6, 13, 8, 'E'],
];
