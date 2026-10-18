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

**Window**:
A static, non-draggable styled panel with a title bar, used for Project cards and on the Resume page.
_Avoid_: Card, tile, icon

**World**:
The full-screen 3D voxel town rendered behind the homepage content; the camera glides to each Step's Host as the Stage advances, and it switches between day and night with the theme. Purely decorative: nothing essential lives only in the World.
_Avoid_: Scene, background, game

**Stage**:
The homepage as a sequence of Steps revealed one at a time over the World as the page scrolls.
_Avoid_: Slideshow, carousel

**Step**:
One full-height section of the Stage (Hello, Work Experience, Projects, Blog, Contact) holding a single glass card. Only the active Step's card is shown; the others stay in the page for keyboard, screen-reader and no-JS users.
_Avoid_: Slide, panel, page

**Host**:
The Cast Member the camera frames for a Step: Minh (Hello), Phoenix Wright (Work Experience), Joker (Projects), Isabelle (Blog), Reshiram (Contact).
_Avoid_: Guide, mascot

**Cast Member**:
A character standing in the World (the owner or a fan-art game character), clickable for a speech bubble.
_Avoid_: NPC, sprite, avatar

**Voxel Model**:
A character or prop defined as a palette plus text layer grids (or boxes painted into them), turned into a merged mesh at runtime.
_Avoid_: Asset, 3D model (when referring to these code-authored grids)

## Structure

**Nav**: Home, Projects, Work Experience, Blog, Contact — five top-level items. The Resume is not its own nav item; it's reached via a link on the Contact page.

## Theme

Cute and game-like but recruiter-readable: the homepage is a Stage of dark frosted-glass cards over the World, with playful accents (rounded "sticker" page titles with a slight tilt, pill-shaped nav and buttons, chunky offset shadows) applied only to chrome/headers/buttons — never to body text or data-dense areas like Work Experience. Palette is "Pallet Town": grass green accent and sky-blue secondary on a pale meadow background, with white panels on inner pages so content stands off the page; dark mode is a forest-night version of the same. Headings use Fredoka (rounded); body text uses Atkinson Hyperlegible. Every text/background pairing meets WCAG AA.
