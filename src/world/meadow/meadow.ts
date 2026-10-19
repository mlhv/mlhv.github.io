import { DirectionalLight, Fog, Group, HemisphereLight, MeshLambertMaterial } from 'three';
import { buildClouds } from './clouds';
import { buildFireflies } from './fireflies';
import { buildGrass } from './grass';
import { buildGround } from './ground';
import { CAMERA, SUN_DIRECTION, TREES, TREE_SWAY, TREE_SWAY_SECONDS, heightAt } from './layout';
import type { MeadowPalette } from './palette';
import { TIERS, type Tier } from './quality';
import { buildSky } from './sky';
import { createTree } from './trees';

export interface Meadow {
	group: Group;
	/** Set it as scene.fog; applyTheme recolours it. */
	fog: Fog;
	/** Moves every ambient motion to `seconds` since start. Reduced motion calls it once with 0. */
	update: (seconds: number) => void;
	applyTheme: (palette: MeadowPalette) => void;
	/** Thins the grass to a lower tier's blade count; never above the count it was built with. */
	setTier: (tier: Tier) => void;
}

/** The whole meadow, with grass built for `tier`. main.ts disposes it along with the rest of the scene. */
export const buildMeadow = (tier: Tier): Meadow => {
	const time = { value: 0 };
	const fog = new Fog(0xffffff, 100, 500);
	const hemi = new HemisphereLight();
	const key = new DirectionalLight();
	const [cx, cy, cz] = CAMERA.position;
	const [sx, sy, sz] = SUN_DIRECTION;
	key.position.set(cx + sx * 300, cy + sy * 300, cz + sz * 300);

	const sky = buildSky();
	const ground = buildGround();
	const grass = buildGrass(TIERS[tier].blades, time);
	const trunk = new MeshLambertMaterial({ flatShading: true });
	const canopy = new MeshLambertMaterial({ flatShading: true });
	const trees = TREES.map((spec) => {
		const tree = createTree(spec, { trunk, canopy });
		tree.position.set(spec.x, heightAt(spec.x, spec.z), spec.z);
		return tree;
	});
	const clouds = buildClouds();
	const fireflies = buildFireflies(time);

	const group = new Group();
	group.add(hemi, key, sky.group, ground.group, grass.mesh, ...trees, clouds.group, fireflies);

	return {
		group,
		fog,
		update: (seconds) => {
			time.value = seconds;
			trees.forEach((tree, i) => {
				tree.rotation.z = Math.sin((seconds / TREE_SWAY_SECONDS) * Math.PI * 2 + TREES[i].seed) * TREE_SWAY;
			});
			clouds.update(seconds);
		},
		applyTheme: (palette) => {
			fog.color.set(palette.fog);
			fog.near = palette.fogNear;
			fog.far = palette.fogFar;
			hemi.color.set(palette.hemiSky);
			hemi.groundColor.set(palette.hemiGround);
			hemi.intensity = palette.hemiIntensity;
			key.color.set(palette.keyLight);
			key.intensity = palette.keyIntensity;
			sky.applyTheme(palette);
			ground.applyTheme(palette);
			grass.applyTheme(palette);
			trunk.color.set(palette.trunk);
			canopy.color.set(palette.canopy);
			clouds.applyTheme(palette);
			fireflies.visible = palette.fireflies;
		},
		setTier: (next) => grass.setCount(TIERS[next].blades),
	};
};
