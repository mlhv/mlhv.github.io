import { BufferGeometry, Color, Float32BufferAttribute, Mesh, MeshLambertMaterial } from 'three';
import { FACES, visibleFaces } from './faces';
import type { Voxel } from './model';

export interface VoxelMeshOptions {
	/** World units per voxel. */
	scale?: number;
	/** Put the bottom-centre of the model's bounds at the origin. */
	center?: boolean;
}

/** One merged geometry with per-vertex colours; hidden faces are culled. */
export const buildVoxelGeometry = (
	voxels: readonly Voxel[],
	{ scale = 1, center = true }: VoxelMeshOptions = {},
): BufferGeometry => {
	let ox = 0;
	let oy = 0;
	let oz = 0;
	if (center && voxels.length > 0) {
		let minX = Infinity, maxX = -Infinity, minY = Infinity, minZ = Infinity, maxZ = -Infinity;
		for (const { x, y, z } of voxels) {
			minX = Math.min(minX, x);
			maxX = Math.max(maxX, x);
			minY = Math.min(minY, y);
			minZ = Math.min(minZ, z);
			maxZ = Math.max(maxZ, z);
		}
		ox = -(minX + maxX + 1) / 2;
		oy = -minY;
		oz = -(minZ + maxZ + 1) / 2;
	}

	const positions: number[] = [];
	const normals: number[] = [];
	const colors: number[] = [];
	const indices: number[] = [];
	const colorCache = new Map<string, Color>();

	for (const { voxel, face } of visibleFaces(voxels)) {
		const { dir, corners } = FACES[face];
		let color = colorCache.get(voxel.color);
		if (!color) {
			// Hex is sRGB; Color converts it to the linear working space vertex colours expect.
			color = new Color(voxel.color);
			colorCache.set(voxel.color, color);
		}
		const base = positions.length / 3;
		for (const [cx, cy, cz] of corners) {
			positions.push((voxel.x + cx + ox) * scale, (voxel.y + cy + oy) * scale, (voxel.z + cz + oz) * scale);
			normals.push(...dir);
			colors.push(color.r, color.g, color.b);
		}
		indices.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
	}

	const geometry = new BufferGeometry();
	geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
	geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
	geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
	geometry.setIndex(indices);
	return geometry;
};

export const buildVoxelMesh = (voxels: readonly Voxel[], options?: VoxelMeshOptions): Mesh =>
	new Mesh(buildVoxelGeometry(voxels, options), new MeshLambertMaterial({ vertexColors: true }));
