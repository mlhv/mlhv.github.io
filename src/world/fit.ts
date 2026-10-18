import type { Vec3 } from './camera-path';

export interface Fit {
	scale: number;
	offset: Vec3;
}

/**
 * Uniform scale and offset that make a model's box `height` tall, its bottom at y = 0 and its centre on x = z = 0.
 * Apply as `object.scale.setScalar(scale); object.position.set(...offset)`. A flat box keeps scale 1; an empty box is left alone.
 */
export const fitToHeight = ({ min, max }: { min: Vec3; max: Vec3 }, height: number): Fit => {
	if (![...min, ...max].every(Number.isFinite)) return { scale: 1, offset: [0, 0, 0] };
	const span = max[1] - min[1];
	const scale = span > 0 ? height / span : 1;
	return {
		scale,
		offset: [-((min[0] + max[0]) / 2) * scale, -min[1] * scale, -((min[2] + max[2]) / 2) * scale],
	};
};
