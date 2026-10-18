import { describe, expect, it } from 'vitest';
import type { CastMember } from './cast';
import { loadOrder } from './load-order';

const member = (id: string, modelled = true): CastMember => ({
	id,
	name: id,
	position: [0, 0],
	facing: 0,
	height: 10,
	motion: { kind: 'still' },
	source: modelled ? { kind: 'gltf', url: `/models/${id}.glb`, clips: { idle: 'idle' } } : null,
	credit: null,
	lines: ['hi'],
});

const ids = (members: readonly CastMember[]) => members.map((m) => m.id);
const hosts = ['reshiram', 'joker', 'minh', 'isabelle', 'phoenix'].map((id) => member(id));

describe('loadOrder', () => {
	it('loads the Hosts in Step order from Hello', () => {
		expect(ids(loadOrder(hosts, 'hello'))).toEqual(['minh', 'phoenix', 'joker', 'isabelle', 'reshiram']);
	});

	it('loads the first Step’s Host first when the page opens deeper in', () => {
		expect(ids(loadOrder(hosts, 'projects'))).toEqual(['joker', 'minh', 'phoenix', 'isabelle', 'reshiram']);
	});

	it('skips members without a model', () => {
		expect(ids(loadOrder([member('minh', false), member('joker'), member('phoenix', false)], 'hello'))).toEqual(['joker']);
	});

	it('loads extras after the Hosts, in cast order', () => {
		expect(ids(loadOrder([member('gengar'), member('minh'), member('oshawott')], 'hello'))).toEqual(['minh', 'gengar', 'oshawott']);
	});

	it('is empty when nobody has a model', () => {
		expect(loadOrder([member('minh', false)], 'hello')).toEqual([]);
	});
});
