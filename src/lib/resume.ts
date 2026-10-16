export interface Contact {
	email: string;
	linkedin: string;
	github: string;
}

export interface Education {
	school: string;
	location: string;
	degree: string;
	date: string;
	details: string[];
}

export interface SkillGroup {
	label: string;
	items: string[];
}

export interface Experience {
	company: string;
	role: string;
	location: string;
	startDate: string;
	endDate: string;
	highlights: string[];
}

export interface ResumeProject {
	slug: string;
	title: string;
	techStack: string[];
	highlights: string[];
}

export interface Resume {
	name: string;
	contact: Contact;
	education: Education[];
	skills: SkillGroup[];
	experience: Experience[];
	projects: ResumeProject[];
}

/** Résumé data the site renders: everything except projects, which live in src/content/projects. */
export type SiteResume = Omit<Resume, 'projects'>;

/** Strip LaTeX comments: a `%` not escaped as `\%` runs to end of line. */
export const stripComments = (tex: string): string => tex.replace(/(?<!\\)%.*$/gm, '');

/**
 * Read `count` brace-delimited arguments starting at `pos` (whitespace between
 * arguments is skipped). Braces nest. Returns the raw argument text and the
 * index just past the last closing brace.
 */
const readArgs = (src: string, pos: number, count: number): { args: string[]; end: number } => {
	const args: string[] = [];
	let i = pos;
	for (let n = 0; n < count; n++) {
		while (/\s/.test(src[i] ?? '')) i++;
		if (src[i] !== '{') throw new Error(`Expected '{' at offset ${i}, found '${src[i] ?? 'EOF'}'`);
		let depth = 0;
		const start = i + 1;
		for (; i < src.length; i++) {
			if (src[i] === '\\') {
				i++; // skip the escaped character, e.g. \{ or \%
				continue;
			}
			if (src[i] === '{') depth++;
			if (src[i] === '}' && --depth === 0) break;
		}
		if (depth !== 0) throw new Error(`Unbalanced braces starting at offset ${start - 1}`);
		args.push(src.slice(start, i));
		i++;
	}
	return { args, end: i };
};

/** Convert a LaTeX fragment from the résumé template into plain text. */
export const cleanLatex = (s: string): string => {
	let out = s.replace(/\\href\{[^{}]*\}\{([^{}]*)\}/g, '$1');
	let prev: string;
	do {
		prev = out;
		out = out.replace(/\\(?:textbf|emph|textit|underline)\{([^{}]*)\}/g, '$1');
	} while (out !== prev);
	return out
		.replace(/\\(?:small|Huge|Large|large|scshape|vspace\{[^}]*\})/g, '')
		.replace(/\$\\sim\$/g, '~')
		.replace(/\$\|\$/g, '|')
		.replace(/\\([%&$#_])/g, '$1')
		.replace(/--/g, '–')
		.replace(/\\\\/g, ' ')
		.replace(/[{}]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
};

const slugify = (s: string): string =>
	s
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

const splitList = (s: string): string[] =>
	cleanLatex(s)
		.split(',')
		.map((x) => x.trim())
		.filter(Boolean);

type Block = { args: string[]; items: string[] };

/** Walk a section body, grouping each \resumeItem under the heading macro before it. */
const readBlocks = (body: string): Block[] => {
	const blocks: Block[] = [];
	// (?![A-Za-z]) stops \resumeItem matching \resumeItemListStart.
	const re = /\\(resumeSubheading|resumeProjectHeading|resumeItem)(?![A-Za-z])/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(body))) {
		const macro = m[1];
		const count = macro === 'resumeSubheading' ? 4 : macro === 'resumeProjectHeading' ? 2 : 1;
		const { args, end } = readArgs(body, re.lastIndex, count);
		if (macro === 'resumeItem') blocks.at(-1)?.items.push(cleanLatex(args[0]));
		else blocks.push({ args, items: [] });
		re.lastIndex = end;
	}
	return blocks;
};

/** Split the document into `{ title, body }` per \section; titles are lower-cased plain text. */
const readSections = (tex: string): { title: string; body: string }[] => {
	const re = /\\section\{/g;
	const starts: { title: string; bodyStart: number; at: number }[] = [];
	let m: RegExpExecArray | null;
	while ((m = re.exec(tex))) {
		const { args, end } = readArgs(tex, m.index + '\\section'.length, 1);
		starts.push({ title: cleanLatex(args[0]).toLowerCase(), bodyStart: end, at: m.index });
	}
	return starts.map((s, i) => ({
		title: s.title,
		body: tex.slice(s.bodyStart, starts[i + 1]?.at ?? tex.length),
	}));
};

const readHeading = (tex: string): { name: string; contact: Contact } => {
	const center = tex.match(/\\begin\{center\}([\s\S]*?)\\end\{center\}/)?.[1];
	if (!center) throw new Error('Résumé heading (\\begin{center} block) not found');
	const bold = center.indexOf('\\textbf');
	if (bold === -1) throw new Error('Résumé heading has no \\textbf{name}');
	const name = cleanLatex(readArgs(center, bold + '\\textbf'.length, 1).args[0]);
	// Only \href targets are read, so the phone number (plain text) is never extracted.
	const hrefs = [...center.matchAll(/\\href\{([^{}]*)\}/g)].map((h) => h[1]);
	const find = (pred: (url: string) => boolean, label: string): string => {
		const url = hrefs.find(pred);
		if (!url) throw new Error(`Résumé heading is missing a ${label} link`);
		return url;
	};
	return {
		name,
		contact: {
			email: find((u) => u.startsWith('mailto:'), 'mailto:').slice('mailto:'.length),
			linkedin: find((u) => u.includes('linkedin.com'), 'LinkedIn'),
			github: find((u) => u.includes('github.com'), 'GitHub'),
		},
	};
};

/** Parse master-resume.tex (Jake's Resume template) into structured data. */
export const parseResume = (rawTex: string): Resume => {
	const tex = stripComments(rawTex);
	const { name, contact } = readHeading(tex);
	const resume: Resume = { name, contact, education: [], skills: [], experience: [], projects: [] };

	for (const { title, body } of readSections(tex)) {
		if (title.startsWith('education')) {
			for (const b of readBlocks(body)) {
				// Education macro order: {school}{location}{degree}{date}
				const [school, location, degree, date] = b.args.map(cleanLatex);
				resume.education.push({ school, location, degree, date, details: b.items });
			}
		} else if (title.includes('skills')) {
			for (const m of body.matchAll(/\\textbf\{([^{}]*)\}\{:\s*([^{}]*)\}/g)) {
				resume.skills.push({ label: cleanLatex(m[1]), items: splitList(m[2]) });
			}
		} else if (title.startsWith('experience')) {
			for (const b of readBlocks(body)) {
				// Experience macro order differs: {company}{dates}{role}{location}
				const [company, dates, role, location] = b.args;
				const [startDate, endDate = ''] = dates.split('--').map(cleanLatex);
				resume.experience.push({
					company: cleanLatex(company),
					role: cleanLatex(role),
					location: cleanLatex(location),
					startDate,
					endDate,
					highlights: b.items,
				});
			}
		} else if (title.startsWith('projects')) {
			for (const b of readBlocks(body)) {
				const [nameRaw, stackRaw = ''] = b.args[0].split('$|$');
				const projectTitle = cleanLatex(nameRaw);
				resume.projects.push({
					slug: slugify(projectTitle.split(/ [-–(]/)[0]),
					title: projectTitle,
					techStack: splitList(stackRaw),
					highlights: b.items,
				});
			}
		}
	}

	if (resume.experience.length === 0) {
		throw new Error('No entries found in an "Experience" section; has the résumé template changed?');
	}
	return resume;
};

const PHONE = /\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4}/;

/** True if the text contains anything shaped like a US phone number. */
export const containsPhone = (s: string): boolean => PHONE.test(s);

/** Remove the phone number (and its trailing `$|$` separator) from the .tex heading. */
export const stripPhone = (tex: string): string =>
	tex.replace(new RegExp(`${PHONE.source}\\s*\\$\\|\\$\\s*`, 'g'), '');

// Tectonic is XeTeX-based; these template lines exist only in pdfTeX, so guard them.
const PDFTEX_ONLY = ['\\input{glyphtounicode}', '\\pdfgentounicode=1'];

/** The .tex to compile for the public PDF: phone removed, pdfTeX-only lines guarded for tectonic. */
export const publicPdfSource = (tex: string): string =>
	PDFTEX_ONLY.reduce(
		(src, line) => src.replace(line, `\\ifdefined\\pdfgentounicode ${line}\\fi`),
		stripPhone(tex),
	);

/** Markdown for a newly seeded Project entry. JSON strings are valid YAML. */
export const projectSeedMarkdown = (project: ResumeProject, order: number): string =>
	[
		'---',
		`title: ${JSON.stringify(project.title)}`,
		`description: ${JSON.stringify(project.highlights[0] ?? '')}`,
		`techStack: ${JSON.stringify(project.techStack)}`,
		'featured: false',
		`order: ${order}`,
		'---',
		'',
		...project.highlights.map((h) => `- ${h}`),
		'',
	].join('\n');

/** "https://www.linkedin.com/in/x/" → "linkedin.com/in/x" */
export const displayUrl = (url: string): string => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/+$/, '');
