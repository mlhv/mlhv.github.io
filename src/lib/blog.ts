/** Posts carrying `tag`; every post when no tag is selected (null or ""). */
export const filterPostsByTag = <T extends { tags: readonly string[] }>(posts: readonly T[], tag: string | null): T[] =>
	tag ? posts.filter((post) => post.tags.includes(tag)) : [...posts];

/** Every tag used by any post, unique and sorted. */
export const collectTags = (posts: readonly { tags: readonly string[] }[]): string[] =>
	[...new Set(posts.flatMap((post) => post.tags))].sort();

export const sortPostsNewestFirst = <T extends { data: { date: Date } }>(posts: readonly T[]): T[] =>
	[...posts].sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

/** The `?tag=` value to preselect: only a tag some post carries, otherwise null so the page never opens empty. */
export const initialTag = (param: string | null, posts: readonly { tags: readonly string[] }[]): string | null =>
	param && posts.some((post) => post.tags.includes(param)) ? param : null;
