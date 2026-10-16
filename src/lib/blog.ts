/** Posts carrying `tag`; every post when no tag is selected (null or ""). */
export const filterPostsByTag = <T extends { tags: readonly string[] }>(posts: readonly T[], tag: string | null): T[] =>
	tag ? posts.filter((post) => post.tags.includes(tag)) : [...posts];

/** Every tag used by any post, unique and sorted. */
export const collectTags = (posts: readonly { tags: readonly string[] }[]): string[] =>
	[...new Set(posts.flatMap((post) => post.tags))].sort();

export const sortPostsNewestFirst = <T extends { data: { date: Date } }>(posts: readonly T[]): T[] =>
	[...posts].sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
