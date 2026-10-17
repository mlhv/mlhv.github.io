export type Vec3 = readonly [number, number, number];

export interface CameraKey {
	position: Vec3;
	target: Vec3;
}

/** West to east: Minh → café (Joker) → courthouse (Phoenix) → town hall (Isabelle) → Reshiram's cliff. */
export const CAMERA_KEYS: readonly CameraKey[] = [
	{ position: [-86, 30, 128], target: [-106, -14, -24] },
	{ position: [-34, 28, 64], target: [-28, 8, -10] },
	{ position: [6, 28, 64], target: [8, 8, -12] },
	{ position: [42, 30, 66], target: [40, 10, -12] },
	{ position: [64, 48, 144], target: [76, 38, -10] },
];

const clamp01 = (value: number) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0);

const catmullRom = (p0: number, p1: number, p2: number, p3: number, t: number) =>
	0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t * t * t);

const sample = (points: readonly Vec3[], i: number, t: number): Vec3 => {
	const at = (k: number) => points[Math.min(points.length - 1, Math.max(0, k))];
	const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
	return [0, 1, 2].map((axis) => catmullRom(p0[axis], p1[axis], p2[axis], p3[axis], t)) as unknown as Vec3;
};

/** Camera position and look-at target for scroll progress 0–1, along a Catmull-Rom curve through the keys. */
export const cameraAt = (progress: number, keys: readonly CameraKey[] = CAMERA_KEYS): CameraKey => {
	if (keys.length === 0) throw new Error('cameraAt needs at least one key');
	if (keys.length === 1) return keys[0];
	const p = clamp01(progress) * (keys.length - 1);
	const i = Math.min(Math.floor(p), keys.length - 2);
	const t = p - i;
	if (t === 0) return keys[i];
	if (i === keys.length - 2 && t === 1) return keys[i + 1];
	return {
		position: sample(keys.map((k) => k.position), i, t),
		target: sample(keys.map((k) => k.target), i, t),
	};
};

/** Fraction of the page scrolled, 0 when the page cannot scroll. */
export const scrollProgress = (scrollY: number, scrollHeight: number, viewportHeight: number): number => {
	const range = scrollHeight - viewportHeight;
	return range > 0 ? clamp01(scrollY / range) : 0;
};
