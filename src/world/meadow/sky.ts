import {
	BackSide,
	BufferGeometry,
	Color,
	Float32BufferAttribute,
	Group,
	Mesh,
	Points,
	PointsMaterial,
	ShaderMaterial,
	SphereGeometry,
	Vector3,
} from 'three';
import { CAMERA, SKY_RADIUS, STARS, SUN_DIRECTION, seeded } from './layout';
import type { MeadowPalette } from './palette';

const vertexShader = /* glsl */ `
varying vec3 vDirection;
void main() {
	vDirection = position;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const fragmentShader = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uSun;
uniform vec3 uSunDirection;
varying vec3 vDirection;
void main() {
	vec3 direction = normalize(vDirection);
	vec3 colour = mix(uHorizon, uTop, smoothstep(-0.02, 0.5, direction.y));
	float facing = dot(direction, uSunDirection);
	colour += uSun * 0.25 * smoothstep(0.96, 1.0, facing);
	colour = mix(colour, uSun, smoothstep(0.9990, 0.9994, facing));
	gl_FragColor = vec4(colour, 1.0);
	#include <colorspace_fragment>
}`;

export interface Sky {
	group: Group;
	applyTheme: (palette: MeadowPalette) => void;
}

/** A fixed, seeded dome of stars above the haze, so every visit sees the same sky. */
const buildStars = (): Points => {
	const rand = seeded(7);
	const positions: number[] = [];
	for (let i = 0; i < STARS.count; i++) {
		const theta = rand() * Math.PI * 2;
		const y = 0.08 + 0.92 * rand();
		const r = Math.sqrt(1 - y * y);
		positions.push(STARS.radius * r * Math.cos(theta), STARS.radius * y, STARS.radius * r * Math.sin(theta));
	}
	const geometry = new BufferGeometry();
	geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
	const stars = new Points(geometry, new PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, fog: false }));
	stars.name = 'stars';
	return stars;
};

/** The gradient dome with the sun (or moon) disc, centred on the fixed camera. */
export const buildSky = (): Sky => {
	const uniforms = {
		uTop: { value: new Color() },
		uHorizon: { value: new Color() },
		uSun: { value: new Color() },
		uSunDirection: { value: new Vector3(...SUN_DIRECTION) },
	};
	const dome = new Mesh(
		new SphereGeometry(SKY_RADIUS, 32, 16),
		new ShaderMaterial({ uniforms, vertexShader, fragmentShader, side: BackSide, depthWrite: false }),
	);
	dome.renderOrder = -1;
	dome.frustumCulled = false;
	const stars = buildStars();
	const group = new Group();
	group.position.set(...CAMERA.position);
	group.add(dome, stars);
	return {
		group,
		applyTheme: (palette) => {
			uniforms.uTop.value.set(palette.skyTop);
			uniforms.uHorizon.value.set(palette.skyHorizon);
			uniforms.uSun.value.set(palette.sunDisc);
			stars.visible = palette.stars;
		},
	};
};
