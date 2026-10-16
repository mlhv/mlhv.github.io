# Portfolio Site

A personal portfolio and engineering blog aimed at tech recruiters (2027 SWE internship cycle), built with Astro + TypeScript, deployed to GitHub Pages.

## Language

**Project**:
A discrete piece of work (app, tool, library) shown in the Projects section as a recruiter-skimmable card/grid entry.
_Avoid_: App, repo, build (when referring to the site entry, not the underlying code)

**Post**:
A long-form engineering writing entry in the Blog section, distinct from a Project.
_Avoid_: Article, blog (as a count noun — "a blog" — reserve "Blog" for the section itself)

**Work Experience Entry**:
A professional role (internship or job) held, shown in the Work Experience section and on the Resume page. Never authored in this repo: synced from the master résumé into `src/data/resume.json` by `npm run sync-resume` (ADR 0003).
_Avoid_: Job, position (as the entry name)

**Resume**:
The `/resume` page plus `public/resume.pdf`, both generated from the master résumé. The phone number is never published.

**Desktop**:
The homepage layout: a fake OS-desktop metaphor containing one Window per nav section.
_Avoid_: Homepage (when specifically discussing the desktop metaphor, not the page in general)

**Window**:
A static, non-draggable styled panel on the Desktop representing one nav section (Projects, Work Experience, Blog, Contact); clicking it navigates to that section's real page.
_Avoid_: Card, tile, icon

## Structure

**Nav**: Home, Projects, Work Experience, Blog, Contact — five top-level items. The Resume is not its own nav item; it's reached via a link on the Contact page.

## Theme

Hybrid: a pixel-art/retro-desktop metaphor structures the homepage and interactions (calm, restrained, recruiter-readable), with Persona-5-inspired bold accents (diagonal cuts, dynamic typography) applied only to chrome/headers/buttons — never to body text or data-dense areas like Work Experience. Signature palette is boba/cream-inspired, not Persona's literal red/black/white.
