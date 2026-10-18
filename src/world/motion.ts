/** How a Cast Member's whole body moves, computed in code; its animation clips play on top. */
export type Motion = { kind: 'still' } | { kind: 'soar' };

export interface Pose {
	/** Height above the ground, world units. */
	dy: number;
	/** Small roll around z, radians. */
	sway: number;
}

/** Body offset at time t (seconds). Pure, so it can be tested and reused for a still frame. */
export const motionPose = (motion: Motion, t: number, seed: number): Pose => {
	switch (motion.kind) {
		case 'still':
			return { dy: 0, sway: 0 };
		case 'soar':
			return { dy: Math.sin(t * 0.6 + seed) * 1.5, sway: Math.sin(t * 0.4 + seed) * 0.05 };
	}
};
