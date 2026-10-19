/** The most an optimised model may weigh: 1.5 MB (MiB). Enforced by add-model and by src/world/models.test.ts. */
export const MAX_MODEL_BYTES = 1.5 * 1024 * 1024;

export const formatBytes = (bytes: number): string => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

export interface AddModelArgs {
	input: string;
	id: string;
	idle: string;
	talk: string | null;
	/** Mark every material KHR_materials_unlit, so flat-shaded game art shows its textures as painted. */
	unlit: boolean;
}

const USAGE = 'usage: npm run add-model -- <original.glb> <id> --idle <clip> [--talk <clip>] [--unlit]';

/** Parses `<original.glb> <id> --idle <clip> [--talk <clip>] [--unlit]`, flags in any position. Throws with a usage message. */
export const parseAddModelArgs = (argv: readonly string[]): AddModelArgs => {
	const positional: string[] = [];
	const flags: Record<string, string> = {};
	let unlit = false;
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (!arg.startsWith('--')) {
			positional.push(arg);
			continue;
		}
		if (arg === '--unlit') {
			unlit = true;
			continue;
		}
		const name = arg.slice(2);
		if (name !== 'idle' && name !== 'talk') throw new Error(`unknown flag ${arg}\n${USAGE}`);
		const value = argv[i + 1];
		if (value === undefined || value.startsWith('--')) throw new Error(`${arg} needs a value\n${USAGE}`);
		flags[name] = value;
		i++;
	}
	if (positional.length !== 2) throw new Error(USAGE);
	const [input, id] = positional;
	if (!/^[a-z][a-z0-9-]*$/.test(id)) throw new Error(`id "${id}" must be lowercase letters, digits and dashes (the Cast Member's id)`);
	if (!flags.idle) throw new Error(`--idle <clip> is required\n${USAGE}`);
	if (flags.talk === flags.idle) throw new Error(`--talk must name a different clip from --idle\n${USAGE}`);
	return { input, id, idle: flags.idle, talk: flags.talk ?? null, unlit };
};

/** Why a model can't be used, or null if it can: it must be rigged and contain the named clips. */
export const checkModel = (
	{ skins, clips }: { skins: number; clips: readonly string[] },
	{ idle, talk }: { idle: string; talk: string | null },
): string | null => {
	if (skins === 0) return 'model has no rig (no skin). Rig it first; Mixamo works for human-shaped characters.';
	for (const name of talk ? [idle, talk] : [idle]) {
		if (!clips.includes(name)) return `no clip "${name}". Clips in this file: ${clips.join(', ') || 'none'}`;
	}
	return null;
};
