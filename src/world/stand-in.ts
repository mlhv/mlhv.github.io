import { CapsuleGeometry, Mesh, MeshStandardMaterial, type Material } from 'three';

/** Capsule dimensions for a Stand-in `height` tall, standing on y = 0. */
export const standInShape = (height: number) => {
	const radius = height * 0.2;
	return { radius, length: height - 2 * radius, centerY: height / 2 };
};

/** One material shared by every Stand-in; main.ts recolours it per theme and disposes it on stop. */
export const createStandInMaterial = () =>
	new MeshStandardMaterial({ transparent: true, opacity: 0.55, roughness: 0.6, depthWrite: false });

/** The neutral capsule a Cast Member shows without a model. Dispose only its geometry: the material is shared. */
export const createStandIn = (height: number, material: Material): Mesh => {
	const { radius, length, centerY } = standInShape(height);
	const mesh = new Mesh(new CapsuleGeometry(radius, length, 6, 16), material);
	mesh.position.y = centerY;
	return mesh;
};
