import data from '../data/resume.json';
import type { SiteResume } from './resume';

/** The synced résumé (see scripts/sync-resume.ts). Typed here so a shape change fails `astro check`. */
export const resume: SiteResume = data;
