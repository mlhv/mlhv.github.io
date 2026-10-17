import type { VoxelModel } from '../lib/voxel/model';
import type { Idle } from './idle';

/**
 * Where a Cast Member's model comes from. Upgrade seam: a future `{ kind: 'vox'; url: string }`
 * (MagicaVoxel) joins this union and `loadCharacter` without touching any caller.
 */
export type CharacterSource = { kind: 'voxels'; model: VoxelModel; scale?: number };

export interface CastMember {
	id: string;
	name: string;
	source: CharacterSource;
	/** Base position on the island, world units. */
	position: readonly [x: number, z: number];
	/** Radians around y; 0 faces the camera (+z). */
	facing: number;
	idle: Idle;
	lines: readonly string[];
}
