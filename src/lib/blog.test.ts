import { describe, expect, it } from 'vitest';
import { collectTags, filterPostsByTag, sortPostsNewestFirst } from './blog';

const posts = [
	{ id: 'a', tags: ['go', 'infra'] },
	{ id: 'b', tags: ['ai'] },
	{ id: 'c', tags: ['go'] },
];

describe('filterPostsByTag', () => {
	it('returns the posts that have the tag', () => {
		expect(filterPostsByTag(posts, 'go').map((p) => p.id)).toEqual(['a', 'c']);
	});

	it('returns an empty list when nothing matches', () => {
		expect(filterPostsByTag(posts, 'rust')).toEqual([]);
	});

	it('returns every post when no tag is selected', () => {
		expect(filterPostsByTag(posts, null).map((p) => p.id)).toEqual(['a', 'b', 'c']);
		expect(filterPostsByTag(posts, '').map((p) => p.id)).toEqual(['a', 'b', 'c']);
	});

	it('handles posts with no tags', () => {
		expect(filterPostsByTag([{ tags: [] }], 'go')).toEqual([]);
	});
});

describe('collectTags', () => {
	it('returns unique tags sorted alphabetically', () => {
		expect(collectTags(posts)).toEqual(['ai', 'go', 'infra']);
	});

	it('returns an empty list for no posts', () => {
		expect(collectTags([])).toEqual([]);
	});
});

describe('sortPostsNewestFirst', () => {
	it('orders by date descending without mutating the input', () => {
		const input = [
			{ id: 'old', data: { date: new Date('2026-01-01') } },
			{ id: 'new', data: { date: new Date('2026-09-01') } },
		];
		expect(sortPostsNewestFirst(input).map((p) => p.id)).toEqual(['new', 'old']);
		expect(input[0].id).toBe('old');
	});
});
