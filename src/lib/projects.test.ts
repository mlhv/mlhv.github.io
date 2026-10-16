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
});
