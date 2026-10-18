import { AnimationClip, Box3, Group, type Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { CharacterSource } from './cast';
import { fitToHeight } from './fit';

export interface LoadedCharacter {
	object: Object3D;
	clips: { idle: AnimationClip; talk: AnimationClip | null };
}

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

const findClip = (clips: AnimationClip[], name: string, url: string): AnimationClip => {
	const clip = AnimationClip.findByName(clips, name);
	if (!clip) throw new Error(`${url} has no clip "${name}" (has: ${clips.map((c) => c.name).join(', ') || 'none'})`);
	return clip;
};

/**
 * The only place a CharacterSource becomes a 3D object. Scales the model to `height` with its feet at y = 0,
 * centred on its spot, and finds its clips. Throws (so the caller keeps the Stand-in) if the file or a named clip is missing.
 */
export const loadCharacter = async (source: CharacterSource, height: number): Promise<LoadedCharacter> => {
	const gltf = await loader.loadAsync(source.url);
	const clips = {
		idle: findClip(gltf.animations, source.clips.idle, source.url),
		talk: source.clips.talk ? findClip(gltf.animations, source.clips.talk, source.url) : null,
	};
	const model = gltf.scene;
	model.updateMatrixWorld(true);
	const { min, max } = new Box3().setFromObject(model);
	const { scale, offset } = fitToHeight({ min: [min.x, min.y, min.z], max: [max.x, max.y, max.z] }, height);
	model.scale.setScalar(scale);
	model.position.set(...offset);
	const object = new Group();
	object.add(model);
	return { object, clips };
};
