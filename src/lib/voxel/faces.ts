import type { Voxel } from './model';

export type Vec3 = readonly [number, number, number];

export interface FaceDef {
	dir: Vec3;
	/** Unit-cube corners; triangles are (0, 1, 2) and (2, 1, 3), counter-clockwise from outside. */
	corners: readonly [Vec3, Vec3, Vec3, Vec3];
}

export const FACES: readonly FaceDef[] = [
	{ dir: [-1, 0, 0], corners: [[0, 1, 0], [0, 0, 0], [0, 1, 1], [0, 0, 1]] },
	{ dir: [1, 0, 0], corners: [[1, 1, 1], [1, 0, 1], [1, 1, 0], [1, 0, 0]] },
	{ dir: [0, -1, 0], corners: [[1, 0, 1], [0, 0, 1], [1, 0, 0], [0, 0, 0]] },
	{ dir: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [0, 1, 0], [1, 1, 0]] },
	{ dir: [0, 0, -1], corners: [[1, 0, 0], [0, 0, 0], [1, 1, 0], [0, 1, 0]] },
	{ dir: [0, 0, 1], corners: [[0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]] },
];

export interface VisibleFace {
	voxel: Voxel;
	/** Index into FACES. */
	face: number;
}

const key = (x: number, y: number, z: number) => `${x},${y},${z}`;

/** Faces not touching a filled neighbour. The first voxel at a position wins; duplicates are dropped. */
export const visibleFaces = (voxels: readonly Voxel[]): VisibleFace[] => {
	const filled = new Set(voxels.map((voxel) => key(voxel.x, voxel.y, voxel.z)));
	const seen = new Set<string>();
	const faces: VisibleFace[] = [];
	for (const voxel of voxels) {
		const here = key(voxel.x, voxel.y, voxel.z);
		if (seen.has(here)) continue;
		seen.add(here);
		FACES.forEach(({ dir: [dx, dy, dz] }, face) => {
			if (!filled.has(key(voxel.x + dx, voxel.y + dy, voxel.z + dz))) faces.push({ voxel, face });
		});
	}
	return faces;
};
