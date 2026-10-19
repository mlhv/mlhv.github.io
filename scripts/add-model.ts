/**
 * Optimise a downloaded, rigged character model into public/models/<id>.glb.
 *
 *   npm run add-model -- ~/models/joker.glb joker --idle idle [--talk talk] [--unlit]
 *
 * Keeps only the named clips, prunes and deduplicates, resizes textures to at most 1024 px as WebP, and
 * meshopt-compresses the geometry. Refuses a model with no rig, a missing clip, or a result over the budget.
 * Never edits TypeScript: set `source` and `credit` in src/world/characters/<id>.ts afterwards.
 * See "Sourcing and preparing models" in docs/superpowers/specs/2026-10-18-real-characters-design.md.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, KHRMaterialsUnlit } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, textureCompress } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { checkModel, formatBytes, MAX_MODEL_BYTES, parseAddModelArgs } from '../src/lib/models.ts';

const fail = (message: string): never => {
	console.error(`✗ ${message}`);
	process.exit(1);
};

const args = (() => {
	try {
		return parseAddModelArgs(process.argv.slice(2));
	} catch (error) {
		return fail(error instanceof Error ? error.message : String(error));
	}
})();

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO()
	.registerExtensions(ALL_EXTENSIONS)
	.registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

const doc = await io.read(resolve(args.input));
const root = doc.getRoot();
const problem = checkModel(
	{ skins: root.listSkins().length, clips: root.listAnimations().map((animation) => animation.getName()) },
	args,
);
if (problem) fail(problem);

const keep = new Set([args.idle, args.talk]);
for (const animation of root.listAnimations()) if (!keep.has(animation.getName())) animation.dispose();

if (args.unlit) {
	const unlit = doc.createExtension(KHRMaterialsUnlit);
	for (const material of root.listMaterials()) material.setExtension('KHR_materials_unlit', unlit.createUnlit());
}

await doc.transform(
	prune(),
	dedup(),
	textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024] }),
	meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
);

const glb = await io.writeBinary(doc);
if (glb.byteLength > MAX_MODEL_BYTES) {
	fail(`optimised model is ${formatBytes(glb.byteLength)}, over the ${formatBytes(MAX_MODEL_BYTES)} budget. Pick a lighter model or reduce it in Blender (Decimate modifier).`);
}

const out = resolve(import.meta.dirname, '..', 'public', 'models', `${args.id}.glb`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, glb);

console.log(`✓ public/models/${args.id}.glb (${formatBytes(glb.byteLength)})`);
console.log(`  clips: idle "${args.idle}"${args.talk ? `, talk "${args.talk}"` : ''}`);
console.log(`Next: in src/world/characters/${args.id}.ts set`);
console.log(`  source: { kind: 'gltf', url: '/models/${args.id}.glb', clips: { idle: '${args.idle}'${args.talk ? `, talk: '${args.talk}'` : ''} } },`);
console.log(`  credit: { title, author, licence, url },`);
console.log('then run npm test and commit the .glb with that file.');
