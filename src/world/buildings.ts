import { modelFromBoxes, type VoxelModel } from '../lib/voxel/model';

/** A prop on the island. `windows` shares the model's coordinates and is drawn unlit so it can glow at night. */
export interface Building {
	model: VoxelModel;
	windows?: VoxelModel;
}

export interface Placement {
	building: Building;
	/** World x, z of the model's (0, 0, 0) corner; fronts face +z. */
	at: readonly [x: number, z: number];
}

const WINDOW = { w: '#ffffff' };

export const cafe: Building = {
	model: modelFromBoxes({ R: '#8b4a3a', D: '#3b3b45', W: '#6b4a2b', A: '#2f6b45' }, [
		[1, 0, 1, 20, 13, 14, 'R'],
		[0, 14, 0, 21, 14, 15, 'D'],
		[2, 15, 2, 19, 15, 13, 'D'],
		[4, 16, 4, 17, 16, 11, 'D'],
		[9, 0, 15, 12, 8, 15, 'W'],
		[5, 9, 16, 16, 9, 17, 'A'],
	]),
	windows: modelFromBoxes(WINDOW, [
		[2, 4, 15, 6, 8, 15, 'w'],
		[15, 4, 15, 19, 8, 15, 'w'],
	]),
};

export const courthouse: Building = {
	model: modelFromBoxes({ S: '#e3ddd0', G: '#8b8f99', C: '#f2efe8', W: '#6b4a2b' }, [
		[0, 0, 0, 25, 1, 19, 'G'],
		[2, 2, 2, 23, 15, 15, 'S'],
		[3, 2, 17, 4, 15, 18, 'C'],
		[8, 2, 17, 9, 15, 18, 'C'],
		[16, 2, 17, 17, 15, 18, 'C'],
		[21, 2, 17, 22, 15, 18, 'C'],
		[1, 16, 1, 24, 17, 19, 'G'],
		[4, 18, 15, 21, 18, 19, 'G'],
		[8, 19, 15, 17, 19, 19, 'G'],
		[11, 20, 15, 14, 20, 19, 'G'],
		[11, 2, 16, 14, 10, 16, 'W'],
	]),
	windows: modelFromBoxes(WINDOW, [
		[5, 6, 16, 7, 11, 16, 'w'],
		[18, 6, 16, 20, 11, 16, 'w'],
	]),
};

const townHall: Building = {
	model: modelFromBoxes({ Y: '#e8c37d', G: '#4f8f46', W: '#6b4a2b', F: '#d84545', P: '#dddddd' }, [
		[1, 0, 1, 22, 12, 14, 'Y'],
		[0, 13, 0, 23, 13, 15, 'G'],
		[2, 14, 2, 21, 14, 13, 'G'],
		[4, 15, 4, 19, 15, 11, 'G'],
		[6, 16, 6, 17, 16, 9, 'G'],
		[10, 0, 15, 13, 8, 15, 'W'],
		[11, 17, 7, 11, 24, 7, 'P'],
		[12, 21, 7, 15, 24, 7, 'F'],
	]),
	windows: modelFromBoxes(WINDOW, [
		[3, 4, 15, 7, 8, 15, 'w'],
		[16, 4, 15, 20, 8, 15, 'w'],
	]),
};

const tree: Building = {
	model: modelFromBoxes({ T: '#7a5230', L: '#3f9c4a', l: '#357f3d' }, [
		[2, 0, 2, 3, 5, 3, 'T'],
		[0, 6, 0, 5, 10, 5, 'L'],
		[1, 11, 1, 4, 12, 4, 'l'],
	]),
};

const TREE_SPOTS: readonly (readonly [number, number])[] = [
	[-80, -12], [-86, 14], [-46, 30], [-22, -46], [14, 32], [30, 38], [46, 26], [56, -30], [-4, 36],
];

export const PLACEMENTS: readonly Placement[] = [
	{ building: cafe, at: [-8, -40] },
	{ building: courthouse, at: [-56, -44] },
	{ building: townHall, at: [26, -42] },
	...TREE_SPOTS.map((at) => ({ building: tree, at })),
];
