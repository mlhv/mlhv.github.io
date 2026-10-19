// The meadow as data: every composition number lives here, so the scene can be tuned and tested without three.js.

export type Vec3 = readonly [number, number, number];

export const DEG = Math.PI / 180;

/** A seeded random number generator (mulberry32): the same meadow on every visit. */
export const seeded = (seed: number): (() => number) => {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
};

const smoothstep = (edge0: number, edge1: number, x: number) => {
	const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
	return t * t * (3 - 2 * t);
};

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const normalize = (a: Vec3): Vec3 => {
	const length = Math.hypot(a[0], a[1], a[2]);
	return [a[0] / length, a[1] / length, a[2] / length];
};
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** Low in the grass, looking 4° up across the meadow: the flat horizon sits 40% up a 16:9 screen. */
export const CAMERA: { position: Vec3; target: Vec3 } = { position: [0, 5, 0], target: [0, 12, -100] };

/** Vertical field of view on screens 16:9 or wider. */
export const BASE_FOV = 40;
/** Narrower screens widen the view to keep the side trees, up to this. */
export const MAX_FOV = 75;
const WIDE = 16 / 9;

/** Vertical field of view in degrees: 16:9's horizontal view is kept on narrower screens, capped at MAX_FOV. */
export const verticalFov = (aspect: number): number => {
	if (!(aspect > 0) || aspect >= WIDE) return BASE_FOV;
	const half = Math.atan((Math.tan((BASE_FOV / 2) * DEG) * WIDE) / aspect);
	return Math.min(MAX_FOV, (2 * half) / DEG);
};

/** Where a world point lands on screen through CAMERA: x and y in -1…1 when visible, depth along the view. */
export const project = (point: Vec3, aspect: number): { x: number; y: number; depth: number } => {
	const forward = normalize(sub(CAMERA.target, CAMERA.position));
	const right = normalize(cross(forward, [0, 1, 0]));
	const up = cross(right, forward);
	const v = sub(point, CAMERA.position);
	const depth = dot(v, forward);
	const t = Math.tan((verticalFov(aspect) / 2) * DEG);
	return { x: dot(v, right) / (depth * t * aspect), y: dot(v, up) / (depth * t), depth };
};

/** Tallest hill, world units (a Host is 17). */
export const HILL_HEIGHT = 12;
/** Hill height near the camera, where the meadow is almost flat. */
const NEAR_HILL = 1.5;

/** A smooth 0–1 hill shape. */
const hillShape = (x: number, z: number) =>
	0.5 + 0.3 * Math.sin(0.018 * x + 1.3) * Math.cos(0.022 * z) + 0.2 * Math.sin(0.041 * x - 0.017 * z + 0.7);

/** Ground height at (x, z): gentle near the camera, rolling hills in the distance. */
export const heightAt = (x: number, z: number): number =>
	hillShape(x, z) * (NEAR_HILL + (HILL_HEIGHT - NEAR_HILL) * smoothstep(40, 220, -z));

/** 0 for near ground, 1 for far: blends grassNear into grassFar. */
export const groundShade = (distance: number): number => smoothstep(20, 320, distance);

/** The ground plane: x −420…420, z −440…40. */
export const GROUND = { width: 840, depth: 480, centerZ: -200, segmentsX: 70, segmentsZ: 40 };

export interface Peak {
	x: number;
	z: number;
	height: number;
	radius: number;
	turn: number;
}

const ring = (count: number, distance: number, heights: [number, number], radii: [number, number], rand: () => number): Peak[] =>
	Array.from({ length: count }, (_, i) => {
		const angle = (-70 + (140 * (i + 0.5 * rand())) / count) * DEG;
		return {
			x: Math.sin(angle) * distance,
			z: -Math.cos(angle) * distance,
			height: heights[0] + (heights[1] - heights[0]) * rand(),
			radius: radii[0] + (radii[1] - radii[0]) * rand(),
			turn: rand() * Math.PI,
		};
	});

/** Two rows of peaks along the horizon; fog dissolves them. */
export const MOUNTAINS: Peak[] = (() => {
	const rand = seeded(3);
	return [...ring(12, 430, [80, 150], [60, 90], rand), ...ring(14, 360, [50, 110], [45, 75], rand)];
})();

export interface TreeSpec {
	x: number;
	z: number;
	/** World units, base to canopy top. */
	height: number;
	seed: number;
}

/** Clumps in the left and right thirds (they frame the card), plus two far trees for depth. */
export const TREES: TreeSpec[] = [
	{ x: -35, z: -80, height: 38, seed: 1 },
	{ x: -48, z: -95, height: 44, seed: 2 },
	{ x: -28, z: -100, height: 34, seed: 3 },
	{ x: 32, z: -65, height: 36, seed: 4 },
	{ x: 44, z: -78, height: 42, seed: 5 },
	{ x: 38, z: -92, height: 32, seed: 6 },
	{ x: -70, z: -240, height: 48, seed: 7 },
	{ x: 95, z: -280, height: 52, seed: 8 },
];

/** Canopy rock, radians either way. */
export const TREE_SWAY = 2 * DEG;
export const TREE_SWAY_SECONDS = 5;

/** Kept free of trees in the left foreground, for the Hosts when they return. */
export const CLEARING = { xMin: -14, xMax: -8, zMin: -36, zMax: -24 };

export const inClearing = (x: number, z: number): boolean =>
	x >= CLEARING.xMin && x <= CLEARING.xMax && z >= CLEARING.zMin && z <= CLEARING.zMax;

/**
 * Blades grow from `near` to `far` in front of the camera, within |x| ≤ spread·distance + margin (a little wider
 * than a 16:9 view). Beyond `far` the ground is plain green.
 */
export const GRASS_AREA = { near: 14, far: 170, spread: 0.75, margin: 4 };

export interface Blade {
	x: number;
	z: number;
	/** World units. */
	height: number;
	/** Radians around y. */
	turn: number;
}

/**
 * `count` blades, each placed independently, so any first n of them is an even sample of the field: lowering a
 * tier by drawing fewer instances thins the grass without bald patches. Distance is log-uniform, so blades are
 * dense near the camera and sparse far away.
 */
export const grassBlades = (count: number, seed = 11): Blade[] => {
	const rand = seeded(seed);
	const ratio = GRASS_AREA.far / GRASS_AREA.near;
	return Array.from({ length: count }, () => {
		const distance = GRASS_AREA.near * ratio ** rand();
		const halfWidth = GRASS_AREA.spread * distance + GRASS_AREA.margin;
		return { x: (rand() * 2 - 1) * halfWidth, z: -distance, height: 2.5 + 2.5 * rand(), turn: (rand() - 0.5) * 1.2 };
	});
};

export interface CloudSpec {
	x: number;
	y: number;
	z: number;
	/** Rough puff radius, world units. */
	size: number;
	seed: number;
}

/** In the upper third of the sky. */
export const CLOUDS: CloudSpec[] = [
	{ x: -480, y: 175, z: -490, size: 32, seed: 21 },
	{ x: -260, y: 150, z: -460, size: 28, seed: 22 },
	{ x: -90, y: 185, z: -500, size: 34, seed: 23 },
	{ x: 60, y: 135, z: -440, size: 24, seed: 24 },
	{ x: 210, y: 170, z: -480, size: 30, seed: 25 },
	{ x: 380, y: 150, z: -470, size: 26, seed: 26 },
];

/** World units per second: about 3 minutes to cross the sky. */
export const CLOUD_SPEED = 3;
/** Clouds wrap from +CLOUD_WRAP back to −CLOUD_WRAP, out of sight on both sides. */
export const CLOUD_WRAP = 700;

/** A cloud's x after `seconds`, starting from `x0`, wrapped into [−CLOUD_WRAP, CLOUD_WRAP). */
export const cloudX = (x0: number, seconds: number): number => {
	const span = 2 * CLOUD_WRAP;
	const shifted = (x0 + CLOUD_SPEED * seconds + CLOUD_WRAP) % span;
	return (shifted < 0 ? shifted + span : shifted) - CLOUD_WRAP;
};

/** Dusk fireflies drift inside this box over the near grass. */
export const FIREFLIES = { count: 40, x: [-40, 40] as [number, number], y: [2, 9] as [number, number], z: [-70, -18] as [number, number] };

export const SKY_RADIUS = 900;
export const STARS = { count: 300, radius: 850 };

/** Low on the left, just above the hills. */
export const SUN_DIRECTION: Vec3 = normalize([-0.62, 0.1, -1]);
