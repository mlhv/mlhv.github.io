import { AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute, Points, ShaderMaterial } from 'three';
import { FIREFLIES, seeded } from './layout';

const vertexShader = /* glsl */ `
uniform float uTime;
attribute float aPhase;
varying float vGlow;
void main() {
	vec3 p = position;
	p.x += sin(uTime * 0.4 + aPhase * 6.28) * 2.5;
	p.y += sin(uTime * 0.7 + aPhase * 12.0) * 1.2;
	p.z += cos(uTime * 0.3 + aPhase * 9.0) * 2.0;
	vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
	vGlow = 0.55 + 0.45 * sin(uTime * 1.6 + aPhase * 20.0);
	gl_PointSize = 240.0 / -viewPosition.z;
	gl_Position = projectionMatrix * viewPosition;
}`;

const fragmentShader = /* glsl */ `
uniform vec3 uColor;
varying float vGlow;
void main() {
	float d = length(gl_PointCoord - 0.5);
	gl_FragColor = vec4(uColor, smoothstep(0.5, 0.0, d) * vGlow);
	#include <colorspace_fragment>
}`;

const FIREFLY_COLOR = '#f6e27a';

/** Glowing specks that bob over the near grass; meadow.ts shows them at dusk only. `time.value` is seconds. */
export const buildFireflies = (time: { value: number }): Points => {
	const rand = seeded(31);
	const between = ([min, max]: [number, number]) => min + (max - min) * rand();
	const positions: number[] = [];
	const phases: number[] = [];
	for (let i = 0; i < FIREFLIES.count; i++) {
		positions.push(between(FIREFLIES.x), between(FIREFLIES.y), between(FIREFLIES.z));
		phases.push(rand());
	}
	const geometry = new BufferGeometry();
	geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
	geometry.setAttribute('aPhase', new Float32BufferAttribute(phases, 1));
	const material = new ShaderMaterial({
		uniforms: { uTime: time, uColor: { value: new Color(FIREFLY_COLOR) } },
		vertexShader,
		fragmentShader,
		transparent: true,
		depthWrite: false,
		blending: AdditiveBlending,
	});
	const fireflies = new Points(geometry, material);
	fireflies.name = 'fireflies';
	fireflies.frustumCulled = false;
	return fireflies;
};
