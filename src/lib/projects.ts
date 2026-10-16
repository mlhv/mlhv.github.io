interface Sortable {
	data: { featured: boolean; order?: number; title: string };
}

const rank = (order?: number) => order ?? Number.MAX_SAFE_INTEGER;

/** Featured first, then by `order` (missing = last), then alphabetically by title. */
export const sortProjects = <T extends Sortable>(projects: readonly T[]): T[] =>
	[...projects].sort(
		(a, b) =>
			Number(b.data.featured) - Number(a.data.featured) ||
			rank(a.data.order) - rank(b.data.order) ||
			a.data.title.localeCompare(b.data.title),
	);

/** Two-letter fallback badge for projects without a logo: "Pkmn-Quant - …" → "PQ". */
export const monogram = (title: string): string => {
	const name = title.split(/ [-–—(]/)[0];
	const words = name.split(/[\s-]+/).filter(Boolean);
	return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
};
