import { Color, InstancedMesh, Matrix4, Mesh, Vector3, type Points } from 'three';
import { describe, expect, it } from 'vitest';
import { MOUNTAINS, heightAt } from './layout';
import type { MeadowPalette } from './palette';
import { buildGround } from './ground';
import { buildGrass } from './grass';
import { buildSky } from './sky';

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
