import { describe, expect, it } from 'vitest';
import fixture from './__fixtures__/master-resume.tex?raw';
import {
	cleanLatex,
	containsPhone,
	displayUrl,
	parseResume,
	projectSeedMarkdown,
	publicPdfSource,
	stripComments,
	stripPhone,
} from './resume';

describe('cleanLatex', () => {
	it('unwraps formatting commands, including nested ones', () => {
		expect(cleanLatex('\\textbf{RAG} and \\emph{\\textbf{Go}}')).toBe('RAG and Go');
	});

	it('converts escapes and symbols used by the resume', () => {
		expect(cleanLatex('\\textbf{$\\sim$2s}, 35\\%, R\\&D, \\$12/mo, A $|$ B, Mar -- Sept')).toBe(
			'~2s, 35%, R&D, $12/mo, A | B, Mar – Sept',
		);
	});

	it('replaces links with their text and collapses whitespace', () => {
		expect(cleanLatex('\\href{https://x.dev}{x.dev}  \n  next')).toBe('x.dev next');
	});
});

describe('parseResume (real resume fixture)', () => {
	const resume = parseResume(fixture);

	it('reads the name and contact links', () => {
		expect(resume.name).toBe('Minh Le');
		expect(resume.contact).toEqual({
			email: 'levuhoangminh1@gmail.com',
			linkedin: 'https://www.linkedin.com/in/hoangminhvule',
			github: 'https://github.com/mlhv',
		});
	});

	it('reads education with its detail bullets', () => {
		expect(resume.education).toHaveLength(1);
		expect(resume.education[0]).toMatchObject({
			school: 'Drexel University',
			location: 'Philadelphia, PA',
			date: 'Expected May 2028',
		});
		expect(resume.education[0].details[0]).toMatch(/^Coursework:/);
	});

	it('reads skill groups as label + item lists', () => {
		expect(resume.skills.map((s) => s.label)).toEqual([
			'Languages',
			'Frameworks',
			'Libraries & Tools',
			'Databases & Infrastructure',
		]);
		expect(resume.skills[0].items).toContain('Go (Golang)');
	});

	it('reads experience in resume order with the {company}{dates}{role}{location} argument order', () => {
		expect(resume.experience.map((e) => e.company)).toEqual(['VisioneerIT', 'Bentley Systems', 'Drexel University']);
		expect(resume.experience[1]).toMatchObject({
			role: 'Software Engineer Intern',
			location: 'Philadelphia, PA',
			startDate: 'Mar 2025',
			endDate: 'Sept 2025',
		});
		expect(resume.experience[1].highlights).toHaveLength(3);
		expect(resume.experience[1].highlights[0]).toContain('from ~2s to 0.2s');
	});

	it('reads projects with slug, title, tech stack and bullets', () => {
		expect(resume.projects.map((p) => p.slug)).toEqual([
			'pkmn-quant',
			'opentelemetry',
			'harbor',
			'sightlink',
			'dragon-shell',
			'socialgym',
			'stylify',
			'du-professorview',
		]);
		expect(resume.projects[0]).toMatchObject({
			title: 'Pkmn-Quant - Algorithmic Trading Backtester',
			techStack: ['Python', 'Polars', 'C++', 'scikit-learn', 'DuckDB'],
		});
		expect(resume.projects[0].highlights).toHaveLength(3);
	});

	it('ignores commented-out LaTeX', () => {
		expect(JSON.stringify(resume)).not.toContain('Sourabh');
		expect(JSON.stringify(resume)).not.toContain('JWT middleware');
	});

	it('never outputs a phone number', () => {
		const withPhone = fixture.replace('\\small \\href{mailto', '\\small (555) 123-4567 $|$ \\href{mailto');
		expect(containsPhone(JSON.stringify(parseResume(withPhone)))).toBe(false);
	});
});

describe('parseResume (template drift)', () => {
	it('throws when the Experience section is missing', () => {
		const noExperience = fixture.replace('\\section{Experience}', '\\section{Work}');
		expect(() => parseResume(noExperience)).toThrow(/Experience/);
	});

	it('throws when the heading block is missing', () => {
		expect(() => parseResume('\\section{Experience}')).toThrow(/heading/);
	});
});

describe('phone handling for the public PDF', () => {
	const heading = (phone: string) => `\\small ${phone} $|$ \\href{mailto:a@b.c}{a@b.c}`;

	it.each(['(555) 867-5309', '555-867-5309', '555.867.5309', '555 867 5309'])('strips %s', (phone) => {
		const out = stripPhone(heading(phone));
		expect(out).toBe('\\small \\href{mailto:a@b.c}{a@b.c}');
		expect(containsPhone(out)).toBe(false);
	});

	it('does not flag resume numbers that are not phone numbers', () => {
		// The raw fixture has a commented-out template sample (+1-123-456-7890); only rendered text matters.
		expect(containsPhone(stripComments(fixture))).toBe(false);
	});

	it('publicPdfSource strips the phone and guards pdfTeX-only lines', () => {
		const src = publicPdfSource(`\\input{glyphtounicode}\n\\pdfgentounicode=1\n${heading('(555) 867-5309')}`);
		expect(containsPhone(src)).toBe(false);
		expect(src).toContain('\\ifdefined\\pdfgentounicode \\input{glyphtounicode}\\fi');
		expect(src).toContain('\\ifdefined\\pdfgentounicode \\pdfgentounicode=1\\fi');
	});
});

describe('projectSeedMarkdown', () => {
	it('writes frontmatter matching the projects schema, and bullets as the body', () => {
		const md = projectSeedMarkdown(
			{ slug: 'x', title: 'X "quoted"', techStack: ['Go', 'C'], highlights: ['First.', 'Second.'] },
			3,
		);
		expect(md).toBe(
			[
				'---',
				'title: "X \\"quoted\\""',
				'description: "First."',
				'techStack: ["Go","C"]',
				'featured: false',
				'order: 3',
				'---',
				'',
				'- First.',
				'- Second.',
				'',
			].join('\n'),
		);
	});
});

describe('displayUrl', () => {
	it('drops the protocol, www and trailing slash', () => {
		expect(displayUrl('https://www.linkedin.com/in/hoangminhvule/')).toBe('linkedin.com/in/hoangminhvule');
		expect(displayUrl('https://github.com/mlhv')).toBe('github.com/mlhv');
	});
});
