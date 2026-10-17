import type { Object3D } from 'three';
import { buildVoxelMesh } from '../lib/voxel/mesh';
import { parseVoxelModel } from '../lib/voxel/model';
import type { CharacterSource } from './cast';

/** Async so a future file-based source (e.g. `.vox`) can fetch without changing callers. */
export const loadCharacter = async (source: CharacterSource): Promise<Object3D> => {
	switch (source.kind) {
		case 'voxels':
			return buildVoxelMesh(parseVoxelModel(source.model), { scale: source.scale ?? 1 });
	}
};
