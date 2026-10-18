import { resolveTheme } from '../lib/theme';

export type WorldTheme = 'light' | 'dark';

export interface WorldPreset {
	sky: string;
	hemiSky: string;
	hemiGround: string;
	hemiIntensity: number;
	sun: string;
	sunIntensity: number;
	sea: string;
	/** Unlit building-window colour. */
	glow: string;
	stars: boolean;
	/** Stand-in colour (also its emissive colour). */
	standIn: string;
	/** Stand-in emissive intensity: a hint by day, a soft glow at night. */
	standInGlow: number;
}

/** Light mode is day; dark mode is night. */
export const PRESETS: Record<WorldTheme, WorldPreset> = {
	light: {
		sky: '#bfe3ff',
		hemiSky: '#ffffff',
		hemiGround: '#9fd99a',
		hemiIntensity: 1.6,
		sun: '#fff4e0',
		sunIntensity: 2.2,
		sea: '#5fb6e6',
		glow: '#9cc9e8',
		stars: false,
		standIn: '#bff5df',
		standInGlow: 0.15,
	},
	dark: {
		sky: '#16233a',
		hemiSky: '#6b7fb3',
		hemiGround: '#1d3a2a',
		hemiIntensity: 0.7,
		sun: '#9fb4ff',
		sunIntensity: 0.6,
		sea: '#1d3557',
		glow: '#ffd27a',
		stars: true,
		standIn: '#bff5df',
		standInGlow: 0.6,
	},
};

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)');

/** The theme the page is actually showing: the stored/toggled choice, else the OS setting. */
export const documentTheme = (): WorldTheme => {
	const chosen = document.documentElement.dataset.theme;
	return resolveTheme(chosen === 'light' || chosen === 'dark' ? chosen : null, systemDark().matches);
};

/** Calls onChange when the toggle flips `data-theme` or the OS theme changes. Returns an unsubscribe. */
export const watchTheme = (onChange: (theme: WorldTheme) => void): (() => void) => {
	const notify = () => onChange(documentTheme());
	const observer = new MutationObserver(notify);
	observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
	const media = systemDark();
	media.addEventListener('change', notify);
	return () => {
		observer.disconnect();
		media.removeEventListener('change', notify);
	};
};
