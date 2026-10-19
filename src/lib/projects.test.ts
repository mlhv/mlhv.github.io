import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { monogram, sortProjects } from './projects';

const p = (title: string, featured = false, order?: number) => ({ id: title, data: { title, featured, order } });

describe('sortProjects', () => {
	it('puts featured projects first, then sorts by order, then by title', () => {
		const sorted = sortProjects([p('C', false, 2), p('B', true, 5), p('A', false, 1), p('D', true, 1)]);
		expect(sorted.map((x) => x.id)).toEqual(['D', 'B', 'A', 'C']);
	});

	it('puts projects without an order after ordered ones, alphabetically', () => {
		const sorted = sortProjects([p('Zed'), p('Alpha'), p('Mid', false, 3)]);
		expect(sorted.map((x) => x.id)).toEqual(['Mid', 'Alpha', 'Zed']);
	});

	it('does not mutate its input', () => {
		const input = [p('B', false, 2), p('A', false, 1)];
		sortProjects(input);
		expect(input.map((x) => x.id)).toEqual(['B', 'A']);
	});
});

describe('monogram', () => {
	it('uses the initials of a multi-word name, ignoring the subtitle', () => {
		expect(monogram('Pkmn-Quant - Algorithmic Trading Backtester')).toBe('PQ');
		expect(monogram('Dragon Shell - Custom Shell and TCP Server')).toBe('DS');
	});

	it('uses the first two letters of a single-word name', () => {
		expect(monogram('OpenTelemetry (Open Source Contributor)')).toBe('OP');
		expect(monogram('Stylify - Virtual Wardrobe App')).toBe('ST');
	});

	it('ignores a subtitle after an em dash', () => {
		expect(monogram('Stylify — Virtual Wardrobe App')).toBe('ST');
	});
});

describe('project links', () => {
	const dir = fileURLToPath(new URL('../content/projects/', import.meta.url));
	const field = (source: string, name: string) => source.match(new RegExp(`^${name}: "(.*)"$`, 'm'))?.[1];
	const entries = readdirSync(dir)
		.filter((file) => file.endsWith('.md'))
		.map((file) => [file, readFileSync(`${dir}${file}`, 'utf8')] as const);

	it.each(entries)('%s links only to its own repo and an https demo', (_, source) => {
		const repoUrl = field(source, 'repoUrl');
		const liveUrl = field(source, 'liveUrl');
		if (repoUrl) expect(repoUrl).toMatch(/^https:\/\/github\.com\/mlhv\/[A-Za-z0-9._-]+$/);
		if (liveUrl) expect(liveUrl).toMatch(/^https:\/\//);
	});

	it('gives recruiters code to click on most projects', () => {
		expect(entries.filter(([, source]) => field(source, 'repoUrl')).length).toBeGreaterThanOrEqual(5);
	});
});
