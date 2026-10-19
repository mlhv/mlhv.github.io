import { Group, IcosahedronGeometry, Mesh, MeshLambertMaterial, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CLOUDS, cloudX, seeded, type CloudSpec } from './layout';
import type { MeadowPalette } from './palette';

export interface Clouds {
	group: Group;
	update: (seconds: number) => void;
	applyTheme: (palette: MeadowPalette) => void;
}

/** Four faceted puffs in a row, flattened. */
const cloudGeometry = (spec: CloudSpec): BufferGeometry => {
	const rand = seeded(spec.seed);
	const puffs = [0, 1, 2, 3].map((i) =>
		new IcosahedronGeometry(spec.size * (0.55 + 0.25 * rand()), 0).translate(
			(i - 1.5) * spec.size * 0.7,
			rand() * spec.size * 0.25,
			(rand() - 0.5) * spec.size * 0.4,
		),
	);
	const merged = mergeGeometries(puffs);
	for (const puff of puffs) puff.dispose();
	return merged.scale(1, 0.6, 1);
};

/** Slow clouds in the upper sky. Unfogged, so they read against the gradient at their distance. */
export const buildClouds = (): Clouds => {
	const material = new MeshLambertMaterial({ flatShading: true, fog: false });
	const meshes = CLOUDS.map((spec) => {
		const mesh = new Mesh(cloudGeometry(spec), material);
		mesh.position.set(spec.x, spec.y, spec.z);
		return mesh;
	});
	const group = new Group();
	group.add(...meshes);
	return {
		group,
		update: (seconds) => {
			meshes.forEach((mesh, i) => {
				mesh.position.x = cloudX(CLOUDS[i].x, seconds);
			});
		},
		applyTheme: (palette) => {
			material.color.set(palette.cloud);
			// Lit from the low sun behind them, clouds would go grey; a soft self-glow keeps them bright.
			material.emissive.set(palette.cloud);
			material.emissiveIntensity = 0.35;
		},
	};
};
