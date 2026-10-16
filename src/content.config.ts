import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
	loader: glob({ pattern: '*.md', base: './src/content/projects' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			techStack: z.array(z.string()).min(1),
			repoUrl: z.url().optional(),
			liveUrl: z.url().optional(),
			/** Path relative to the .md file, e.g. ./logos/pkmn-quant.png */
			logo: image().optional(),
			featured: z.boolean().default(false),
			order: z.number().int().optional(),
			date: z.coerce.date().optional(),
		}),
});

export const collections = { projects };
