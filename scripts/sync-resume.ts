/**
 * Sync résumé data from the resume repo into the portfolio.
 *
 *   npm run sync-resume                       # src/data/resume.json + public/resume.pdf
 *   npm run sync-resume -- --seed-projects    # also create MISSING src/content/projects/<slug>.md
 *
 * Env: RESUME_DIR (default ~/Desktop/resume), RESUME_TEX (default sources/master-resume.tex, relative to RESUME_DIR).
 * Existing project files are never overwritten, and projects are only seeded with the flag,
 * so deleting a project file keeps it deleted.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { containsPhone, parseResume, projectSeedMarkdown, publicPdfSource, stripComments } from '../src/lib/resume.ts';

const root = resolve(import.meta.dirname, '..');
const resumeDir = process.env.RESUME_DIR ?? join(homedir(), 'Desktop', 'resume');
const texName = process.env.RESUME_TEX ?? 'sources/master-resume.tex';
const texPath = resolve(resumeDir, texName);
const seedProjects = process.argv.includes('--seed-projects');

if (!existsSync(texPath)) {
	console.error(`✗ ${texPath} not found. Set RESUME_DIR / RESUME_TEX.`);
	process.exit(1);
}

const tex = readFileSync(texPath, 'utf8');
// parseResume throws on template drift before anything is written.
const { projects, ...site } = parseResume(tex);

mkdirSync(join(root, 'src/data'), { recursive: true });
writeFileSync(
	join(root, 'src/data/resume.json'),
	`${JSON.stringify({ _generated: `npm run sync-resume from ${texName}. Do not edit by hand.`, ...site }, null, '\t')}\n`,
);
console.log(`✓ src/data/resume.json: ${site.experience.length} roles, ${site.skills.length} skill groups`);

const hasTectonic = (() => {
	try {
		execFileSync('tectonic', ['--version'], { stdio: 'ignore' });
		return true;
	} catch {
		return false;
	}
})();

const pdfTex = publicPdfSource(tex);
// Comments never render, so only check live LaTeX (the template has a commented-out sample number).
if (containsPhone(stripComments(pdfTex))) {
	console.error('✗ A phone number survived stripping; refusing to build public/resume.pdf. Check the résumé heading format.');
	process.exitCode = 1;
} else if (!hasTectonic) {
	console.warn('⚠ tectonic not found (brew install tectonic); public/resume.pdf left unchanged');
} else {
	const work = mkdtempSync(join(tmpdir(), 'resume-sync-'));
	try {
		writeFileSync(join(work, 'resume.tex'), pdfTex);
		execFileSync('tectonic', ['--outdir', work, join(work, 'resume.tex')], { stdio: 'pipe' });
		copyFileSync(join(work, 'resume.pdf'), join(root, 'public/resume.pdf'));
		console.log('✓ public/resume.pdf built (phone number removed)');
	} catch (error) {
		const stderr = (error as { stderr?: Buffer }).stderr?.toString() ?? String(error);
		console.error(`✗ PDF build failed:\n${stderr.split('\n').filter((l) => l.startsWith('error') || l.startsWith('!')).join('\n') || stderr}`);
		process.exitCode = 1;
	} finally {
		rmSync(work, { recursive: true, force: true });
	}
}

if (seedProjects) {
	const dir = join(root, 'src/content/projects');
	mkdirSync(dir, { recursive: true });
	const created = projects.flatMap((project, i) => {
		const file = join(dir, `${project.slug}.md`);
		if (existsSync(file)) return [];
		writeFileSync(file, projectSeedMarkdown(project, i + 1));
		return [project.slug];
	});
	console.log(created.length ? `✓ seeded projects: ${created.join(', ')}` : '✓ projects: every résumé project already has a file');
} else {
	console.log(`• projects untouched (${projects.length} in résumé; pass --seed-projects to create missing files)`);
}
