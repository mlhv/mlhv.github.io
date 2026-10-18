import { STEPS, type StepId } from '../stage/steps';

export type Vec3 = readonly [number, number, number];

export interface CameraKey {
	position: Vec3;
	target: Vec3;
}

export interface Framing {
	/** The Cast Member this Step frames; camera-path.test.ts checks `anchor` matches where they stand. */
	castId: string;
	/** Host base x, a point roughly at body height, base z. */
	anchor: Vec3;
	/** Which side of the centred card the Host appears on in landscape. */
	side: 'left' | 'right';
	/** Camera distance from the Host, world units; bigger Hosts need more. */
	distance: number;
}

/** West to east so the camera never backtracks: Minh → Phoenix → Joker → Isabelle → Reshiram on his cliff. */
export const FRAMINGS: Record<StepId, Framing> = {
	hello: { castId: 'minh', anchor: [-60, 7, 12], side: 'left', distance: 60 },
	work: { castId: 'phoenix', anchor: [-34, 7, -8], side: 'right', distance: 60 },
	projects: { castId: 'joker', anchor: [6, 7, -6], side: 'left', distance: 48 },
	blog: { castId: 'isabelle', anchor: [40, 7, -6], side: 'right', distance: 60 },
	contact: { castId: 'reshiram', anchor: [74, 40, -4], side: 'left', distance: 160 },
};

/**
 * Landscape: the Host sits about a fifth of the way in from one edge, beside the centred card.
 * Portrait: the Host sits in the band above the card.
 */
export const frame = ({ anchor: [x, y, z], side, distance: d }: Framing, layout: 'landscape' | 'portrait'): CameraKey => {
	if (layout === 'portrait') return { position: [x, y + d * 0.3, z + d], target: [x, y - d * 0.22, z] };
	const shift = side === 'left' ? d * 0.4 : -d * 0.4;
	return { position: [x + shift, y + d * 0.35, z + d], target: [x + shift, y, z] };
};

export const SHOTS = Object.fromEntries(
	STEPS.map(({ id }) => [id, { landscape: frame(FRAMINGS[id], 'landscape'), portrait: frame(FRAMINGS[id], 'portrait') }]),
) as Record<StepId, { landscape: CameraKey; portrait: CameraKey }>;

/** The shot for a Step at a viewport aspect (width / height): portrait below 1. */
export const shotFor = (step: StepId, aspect: number): CameraKey =>
	aspect < 1 ? SHOTS[step].portrait : SHOTS[step].landscape;

export const GLIDE_SECONDS = 1.2;

const clamp01 = (value: number) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0);
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const lerp3 = (a: Vec3, b: Vec3, e: number): Vec3 => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];

/** Camera between two shots at glide progress t (0–1, clamped), eased in and out. Returns the endpoints themselves at 0 and 1. */
export const tweenShot = (from: CameraKey, to: CameraKey, t: number): CameraKey => {
	const e = easeInOutCubic(clamp01(t));
	if (e === 0) return from;
	if (e === 1) return to;
	return { position: lerp3(from.position, to.position, e), target: lerp3(from.target, to.target, e) };
};

/** A camera move in progress. `start` is in seconds on the caller's clock. */
export interface Glide {
	from: CameraKey;
	to: CameraKey;
	start: number;
}

export const still = (shot: CameraKey): Glide => ({ from: shot, to: shot, start: 0 });

export const glideAt = (glide: Glide, now: number): CameraKey =>
	tweenShot(glide.from, glide.to, (now - glide.start) / GLIDE_SECONDS);

/** A new glide to `to` that starts from wherever the camera is right now, so a change of mind never jumps. */
export const retarget = (glide: Glide, to: CameraKey, now: number): Glide => ({ from: glideAt(glide, now), to, start: now });
