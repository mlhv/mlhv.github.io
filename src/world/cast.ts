import type { Motion } from './motion';

/** A Cast Member's optimised model under public/models/, written by `npm run add-model`. */
export type CharacterSource = {
	kind: 'gltf';
	/** e.g. '/models/joker.glb'. */
	url: string;
	/** Animation clip names inside the file. */
	clips: { idle: string; talk?: string };
};

/** The attribution a licensed model requires; listed under the Contact Step. */
export interface Credit {
	title: string;
	author: string;
	/** e.g. 'CC BY 4.0'. */
	licence: string;
	/** The model's source page. */
	url: string;
}

export interface CastMember {
	id: string;
	name: string;
	/** Base position in the meadow (x, z), e.g. in the clearing, world units. */
	position: readonly [x: number, z: number];
	/** Radians around y; 0 faces the camera (+z). */
	facing: number;
	/** World units. The Stand-in is this tall, the model is scaled to it, and the shadow is sized from it. */
	height: number;
	/** null until a model is committed: the Cast Member shows a Stand-in. */
	source: CharacterSource | null;
	motion: Motion;
	/** Required exactly when `source` is set. */
	credit: Credit | null;
	lines: readonly string[];
}
