import { BufferGeometry, DoubleSide, Float32BufferAttribute, InstancedMesh, MeshLambertMaterial, Object3D } from 'three';
import { grassBlades, heightAt } from './layout';
import type { MeadowPalette } from './palette';

export interface Grass {
	mesh: InstancedMesh;
	/** Draws only the first `count` blades (an even sample of the field), never more than were built. */
	setCount: (count: number) => void;
	applyTheme: (palette: MeadowPalette) => void;
}

const BLADE_WIDTH = 0.35;

/** A tapered 3-segment strip, 1 unit tall on y = 0: 7 vertices, 5 triangles. Darker at the base. */
const bladeGeometry = (): BufferGeometry => {
	const positions: number[] = [];
	const colors: number[] = [];
	for (const y of [0, 1 / 3, 2 / 3]) {
		const half = (BLADE_WIDTH / 2) * (1 - y * 0.8);
		const shade = 0.55 + 0.45 * y;
		positions.push(-half, y, 0, half, y, 0);
		colors.push(shade, shade, shade, shade, shade, shade);
	}
	positions.push(0, 1, 0);
	colors.push(1, 1, 1);
	const geometry = new BufferGeometry();
	geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
	geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
	// Lit from above like the ground, so blades and field share one tone.
	geometry.setAttribute('normal', new Float32BufferAttribute(Array.from({ length: 7 }, () => [0, 1, 0]).flat(), 3));
	geometry.setIndex([0, 1, 3, 0, 3, 2, 2, 3, 5, 2, 5, 4, 4, 5, 6]);
	return geometry;
};

/** Bends each blade with a gust that rolls across the field (about every 7 s) plus a small flutter. Bases stay planted. */
const WIND = /* glsl */ `#include <begin_vertex>
	vec3 root = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
	float gust = sin(root.x * 0.035 + root.z * 0.02 - uTime * 0.9);
	float flutter = sin(uTime * 2.3 + root.x * 1.7 + root.z * 1.3) * 0.15;
	float bend = (0.35 + 0.3 * gust + flutter) * position.y * position.y;
	transformed.x += bend;
	transformed.y -= bend * bend * 0.25;`;

/** `count` instanced blades; `time.value` (seconds) drives the wind. */
export const buildGrass = (count: number, time: { value: number }): Grass => {
	const material = new MeshLambertMaterial({ vertexColors: true, side: DoubleSide });
	material.onBeforeCompile = (shader) => {
		shader.uniforms.uTime = time;
		shader.vertexShader = `uniform float uTime;\n${shader.vertexShader.replace('#include <begin_vertex>', WIND)}`;
	};
	const mesh = new InstancedMesh(bladeGeometry(), material, count);
	mesh.name = 'grass';
	// The wind moves blades outside the instances' computed bounds; the field is always in view anyway.
	mesh.frustumCulled = false;
	const dummy = new Object3D();
	grassBlades(count).forEach((blade, i) => {
		dummy.position.set(blade.x, heightAt(blade.x, blade.z), blade.z);
		dummy.rotation.set(0, blade.turn, 0);
		dummy.scale.set(1, blade.height, 1);
		dummy.updateMatrix();
		mesh.setMatrixAt(i, dummy.matrix);
	});
	return {
		mesh,
		setCount: (next) => {
			mesh.count = Math.max(0, Math.min(count, next));
		},
		applyTheme: (palette) => {
			material.color.set(palette.grassNear);
		},
	};
};
