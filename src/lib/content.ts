import { getCollection } from 'astro:content';
import { sortPostsNewestFirst } from './blog';

/** Published posts, newest first. Drafts show only in `astro dev`, never in a production build. */
export const getVisiblePosts = async () =>
	sortPostsNewestFirst(await getCollection('blog', ({ data }) => import.meta.env.DEV || !data.draft));
