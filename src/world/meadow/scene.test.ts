import { Box3, Color, InstancedMesh, Matrix4, Mesh, MeshLambertMaterial, Vector3, type Points } from 'three';
import { describe, expect, it } from 'vitest';
import { CLOUDS, FIREFLIES, MOUNTAINS, TREES, cloudX, heightAt } from './layout';
import type { MeadowPalette } from './palette';
import { buildGround } from './ground';
import { buildGrass } from './grass';
import { buildSky } from './sky';
import { buildClouds } from './clouds';
import { buildFireflies } from './fireflies';
import { createTree } from './trees';
import { buildMeadow } from './meadow';

const day: MeadowPalette = {
	skyTop: '#6fb8ec',
	skyHorizon: '#dcefff',
	sunDisc: '#fff6d8',
	hemiSky: '#ffffff',
	hemiGround: '#a8d48f',
	hemiIntensity: 1.4,
	keyLight: '#fff1d6',
	keyIntensity: 1.6,
	grassNear: '#6fbf5a',
	grassFar: '#a5d48a',
	mountains: '#8fa9c4',
	canopy: '#4f9a4a',
	trunk: '#7a5a3c',
	cloud: '#ffffff',
	fog: '#dcefff',
	fogNear: 120,
	fogFar: 480,
	stars: false,
	fireflies: false,
};
const dusk: MeadowPalette = { ...day, stars: true, fireflies: true, grassNear: '#2e5a4a' };

describe('buildSky', () => {
	it('shows stars only when the palette asks for them', () => {
		const sky = buildSky();
		const stars = sky.group.getObjectByName('stars') as Points;
		sky.applyTheme(day);
		expect(stars.visible).toBe(false);
		sky.applyTheme(dusk);
		expect(stars.visible).toBe(true);
	});
});

describe('buildGround', () => {
	it('follows heightAt', () => {
		const ground = buildGround().group.getObjectByName('ground') as Mesh;
		const position = ground.geometry.getAttribute('position');
		for (let i = 0; i < position.count; i += 97) {
			expect(position.getY(i)).toBeCloseTo(heightAt(position.getX(i), position.getZ(i)), 5);
		}
	});

	it('colours the ground near the camera with grassNear', () => {
		const built = buildGround();
		built.applyTheme(day);
		const ground = built.group.getObjectByName('ground') as Mesh;
		const position = ground.geometry.getAttribute('position');
		const color = ground.geometry.getAttribute('color');
		let nearest = 0;
		for (let i = 0; i < position.count; i++) {
			if (Math.hypot(position.getX(i), position.getZ(i)) < Math.hypot(position.getX(nearest), position.getZ(nearest))) nearest = i;
		}
		const expected = new Color(day.grassNear);
		expect(color.getX(nearest)).toBeCloseTo(expected.r, 3);
		expect(color.getY(nearest)).toBeCloseTo(expected.g, 3);
		expect(color.getZ(nearest)).toBeCloseTo(expected.b, 3);
	});

	it('places one mountain per peak', () => {
		const mountains = buildGround().group.getObjectByName('mountains') as InstancedMesh;
		expect(mountains.count).toBe(MOUNTAINS.length);
	});
});

describe('buildGrass', () => {
	it('draws `count` blades of 5 triangles each, planted on the ground', () => {
		const grass = buildGrass(8000, { value: 0 });
		expect(grass.mesh.count).toBe(8000);
		expect(grass.mesh.geometry.index?.count).toBe(15);
		const matrix = new Matrix4();
		const root = new Vector3();
		for (const i of [0, 1234, 7999]) {
			grass.mesh.getMatrixAt(i, matrix);
			root.setFromMatrixPosition(matrix);
			expect(root.y).toBeCloseTo(heightAt(root.x, root.z), 5);
		}
	});

	it('thins to a lower count but never above the count it was built with', () => {
		const grass = buildGrass(8000, { value: 0 });
		grass.setCount(100);
		expect(grass.mesh.count).toBe(100);
		grass.setCount(60000);
		expect(grass.mesh.count).toBe(8000);
	});
});

describe('createTree', () => {
	it.each(TREES.map((spec) => [spec.seed, spec] as const))('tree %s stands on y = 0 and is about its spec height', (_, spec) => {
		const materials = { trunk: new MeshLambertMaterial(), canopy: new MeshLambertMaterial() };
		const box = new Box3().setFromObject(createTree(spec, materials));
		expect(box.min.y).toBeGreaterThan(-0.01);
		expect(box.max.y).toBeGreaterThan(spec.height * 0.8);
		expect(box.max.y).toBeLessThan(spec.height * 1.15);
	});
});

describe('buildClouds', () => {
	it('drifts each cloud along cloudX', () => {
		const clouds = buildClouds();
		clouds.update(42);
		clouds.group.children.forEach((cloud, i) => expect(cloud.position.x).toBeCloseTo(cloudX(CLOUDS[i].x, 42), 9));
	});
});

describe('buildFireflies', () => {
	it('makes FIREFLIES.count specks inside the firefly box', () => {
		const fireflies = buildFireflies({ value: 0 });
		const position = fireflies.geometry.getAttribute('position');
		expect(position.count).toBe(FIREFLIES.count);
		for (let i = 0; i < position.count; i++) {
			expect(position.getX(i)).toBeGreaterThanOrEqual(FIREFLIES.x[0]);
			expect(position.getX(i)).toBeLessThanOrEqual(FIREFLIES.x[1]);
			expect(position.getY(i)).toBeGreaterThanOrEqual(FIREFLIES.y[0]);
			expect(position.getY(i)).toBeLessThanOrEqual(FIREFLIES.y[1]);
		}
	});
});

describe('buildMeadow', () => {
	it('builds its grass for the tier, and only ever thins it', () => {
		const low = buildMeadow('low');
		const grass = low.group.getObjectByName('grass') as InstancedMesh;
		expect(grass.count).toBe(8000);
		low.setTier('high');
		expect(grass.count).toBe(8000);

		const high = buildMeadow('high');
		const thick = high.group.getObjectByName('grass') as InstancedMesh;
		expect(thick.count).toBe(60000);
		high.setTier('medium');
		expect(thick.count).toBe(25000);
	});

	it('switches the dusk extras and the fog synchronously on applyTheme', () => {
		const meadow = buildMeadow('low');
		const fireflies = meadow.group.getObjectByName('fireflies') as Points;
		const stars = meadow.group.getObjectByName('stars') as Points;
		meadow.applyTheme(dusk);
		expect(fireflies.visible).toBe(true);
		expect(stars.visible).toBe(true);
		meadow.applyTheme(day);
		expect(fireflies.visible).toBe(false);
		expect(stars.visible).toBe(false);
		expect(meadow.fog.color.getHexString()).toBe(new Color(day.fog).getHexString());
		expect(meadow.fog.far).toBe(day.fogFar);
	});

	it('sways the trees as time passes, within ±2°', () => {
		const meadow = buildMeadow('low');
		const tree = meadow.group.getObjectByName('tree');
		meadow.update(0);
		const atStart = tree?.rotation.z ?? Number.NaN;
		meadow.update(1.25);
		expect(tree?.rotation.z).not.toBeCloseTo(atStart, 6);
		expect(Math.abs(tree?.rotation.z ?? 1)).toBeLessThanOrEqual((2 * Math.PI) / 180 + 1e-9);
	});
});
