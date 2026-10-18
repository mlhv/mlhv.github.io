import { describe, expect, it } from 'vitest';
import { checkModel, formatBytes, MAX_MODEL_BYTES, parseAddModelArgs } from './models';

describe('MAX_MODEL_BYTES', () => {
	it('is 1.5 MB', () => {
		expect(MAX_MODEL_BYTES).toBe(1_572_864);
		expect(formatBytes(MAX_MODEL_BYTES)).toBe('1.50 MB');
	});
});

describe('parseAddModelArgs', () => {
	it('reads the file, id and clips', () => {
		expect(parseAddModelArgs(['~/m/joker.glb', 'joker', '--idle', 'idle', '--talk', 'talk'])).toEqual({
			input: '~/m/joker.glb',
			id: 'joker',
			idle: 'idle',
			talk: 'talk',
		});
	});

	it('makes --talk optional and accepts flags in any order', () => {
		expect(parseAddModelArgs(['--idle', 'Breathing Idle', 'a.glb', 'minh'])).toEqual({ input: 'a.glb', id: 'minh', idle: 'Breathing Idle', talk: null });
	});

	it.each([
		[[], /usage/i],
		[['a.glb', 'joker'], /--idle/],
		[['a.glb', '--idle', 'idle'], /usage/i],
		[['a.glb', 'Joker!', '--idle', 'idle'], /id/],
		[['a.glb', 'joker', '--idle'], /--idle needs a value/],
		[['a.glb', 'joker', '--idle', 'idle', '--speed', '2'], /unknown flag --speed/],
		[['a.glb', 'joker', '--idle', 'idle', '--talk', 'idle'], /different clip/],
		[['a.glb', 'joker', 'extra', '--idle', 'idle'], /usage/i],
	])('rejects %j', (argv, message) => {
		expect(() => parseAddModelArgs(argv)).toThrow(message);
	});
});

describe('checkModel', () => {
	const want = { idle: 'idle', talk: 'talk' };

	it('accepts a rigged model with both clips', () => {
		expect(checkModel({ skins: 1, clips: ['idle', 'talk', 'walk'] }, want)).toBeNull();
	});

	it('accepts a missing talk clip when none was asked for', () => {
		expect(checkModel({ skins: 1, clips: ['idle'] }, { idle: 'idle', talk: null })).toBeNull();
	});

	it('rejects a model with no rig', () => {
		expect(checkModel({ skins: 0, clips: ['idle', 'talk'] }, want)).toMatch(/no rig/);
	});

	it('rejects a missing clip and lists the ones that exist', () => {
		expect(checkModel({ skins: 1, clips: ['Survey', 'Run'] }, want)).toBe('no clip "idle". Clips in this file: Survey, Run');
		expect(checkModel({ skins: 1, clips: ['idle'] }, want)).toBe('no clip "talk". Clips in this file: idle');
		expect(checkModel({ skins: 1, clips: [] }, want)).toBe('no clip "idle". Clips in this file: none');
	});
});
