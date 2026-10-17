export type Idle =
	| { kind: 'bob' }
	| { kind: 'float' }
	| { kind: 'wander'; radius: number; hop: boolean }
	| { kind: 'soar' };

export interface Pose {
	dx: number;
	dy: number;
	dz: number;
	/** Absolute facing (radians around y) when the pose decides it; null keeps the Cast Member's own facing. */
	heading: number | null;
	/** Small roll around z, radians. */
	sway: number;
}

export const WANDER_SPEED = 0.35;

/** Offset from a Cast Member's base position at time t (seconds). Pure, so it can be tested and reused for a still frame. */
export const idlePose = (idle: Idle, t: number, seed: number): Pose => {
	switch (idle.kind) {
		case 'bob':
			return { dx: 0, dy: (Math.sin(t * 2 + seed) + 1) * 0.15, dz: 0, heading: null, sway: Math.sin(t * 1.3 + seed) * 0.03 };
		case 'float':
			return { dx: 0, dy: 3 + Math.sin(t * 1.5 + seed) * 1.2, dz: 0, heading: null, sway: Math.sin(t * 0.9 + seed) * 0.06 };
		case 'soar':
			return { dx: 0, dy: Math.sin(t * 0.6 + seed) * 1.5, dz: 0, heading: null, sway: Math.sin(t * 0.4 + seed) * 0.05 };
		case 'wander': {
			// A figure-eight: x swings the full radius, z half of it.
			const a = t * WANDER_SPEED + seed;
			const r = idle.radius;
			return {
				dx: r * Math.sin(a),
				dy: idle.hop ? Math.abs(Math.sin(t * 6 + seed)) * 0.8 : 0,
				dz: (r / 2) * Math.sin(2 * a),
				heading: Math.atan2(r * Math.cos(a), r * Math.cos(2 * a)),
				sway: 0,
			};
		}
	}
};
