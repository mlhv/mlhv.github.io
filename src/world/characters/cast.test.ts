import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { inClearing } from '../meadow/layout';
import { cast, hosts, showHosts } from './index';

const publicFile = (url: string) => fileURLToPath(new URL(`../../../public${url}`, import.meta.url));

describe('cast', () => {
	it('has unique ids', () => {
		const ids = cast.map((m) => m.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it.each(cast.map((m) => [m.id, m] as const))('%s has a name, lines and a height, and stands in the clearing', (_, member) => {
		expect(member.name.trim()).not.toBe('');
		expect(member.lines.length).toBeGreaterThan(0);
		expect(member.height).toBeGreaterThan(0);
		const [x, z] = member.position;
		expect(inClearing(x, z), `${member.id} at ${x},${z}`).toBe(true);
	});

	it.each(cast.map((m) => [m.id, m] as const))('%s has a credit exactly when it has a model, and the model exists', (_, member) => {
		expect(member.credit !== null).toBe(member.source !== null);
		if (!member.source || !member.credit) return;
		expect(member.source.url).toMatch(/^\/models\/[a-z0-9-]+\.glb$/);
		expect(existsSync(publicFile(member.source.url)), `${member.source.url} is missing`).toBe(true);
		expect(member.source.clips.idle.trim()).not.toBe('');
		expect(member.source.clips.talk).not.toBe(member.source.clips.idle);
		for (const field of ['title', 'author', 'licence'] as const) expect(member.credit[field].trim()).not.toBe('');
		expect(member.credit.url).toMatch(/^https:\/\//);
	});
});

describe('hosts', () => {
	it('is the whole cast when showHosts is on, and empty when it is off', () => {
		expect(hosts).toEqual(showHosts ? cast : []);
	});
});
