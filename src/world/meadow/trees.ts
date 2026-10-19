import { CylinderGeometry, Group, IcosahedronGeometry, Mesh, type Material } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { seeded, type TreeSpec } from './layout';

export interface TreeMaterials {
	trunk: Material;
	canopy: Material;
}

/**
 * One low-poly tree, `spec.height` tall, standing on y = 0 at the origin. meadow.ts places and sways it as a whole.
 * The seam for CC0 tree models (spec "Later", Approach C): a loader that returns a Group of the same height,
 * standing on y = 0, can replace this function without changing anything else.
 */
export const createTree = (spec: TreeSpec, materials: TreeMaterials): Group => {
	const h = spec.height;
	const rand = seeded(spec.seed);
	const trunk = new Mesh(new CylinderGeometry(0.05 * h, 0.08 * h, 0.45 * h, 6).translate(0, 0.225 * h, 0), materials.trunk);
	const blobs = [0.6, 0.72, 0.82].map((y) => {
		const radius = (0.2 + 0.06 * rand()) * h;
		return new IcosahedronGeometry(radius, 0).translate((rand() - 0.5) * 0.3 * h, y * h, (rand() - 0.5) * 0.3 * h);
	});
	const canopyGeometry = mergeGeometries(blobs);
	for (const blob of blobs) blob.dispose();
	const canopy = new Mesh(canopyGeometry, materials.canopy);
	const tree = new Group();
	tree.name = 'tree';
	tree.add(trunk, canopy);
	return tree;
};
