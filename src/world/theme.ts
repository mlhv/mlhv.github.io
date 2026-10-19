import { resolveTheme } from '../lib/theme';

import type { MeadowPalette } from './meadow/palette';

export type WorldTheme = 'light' | 'dark';

/** Light mode is day; dark mode is dusk. theme.css copies each skyHorizon and grassNear for the no-WebGL fallback. */
export const PRESETS: Record<WorldTheme, MeadowPalette> = {
	light: {
		skyTop: '#6fb8ec',
		skyHorizon: '#dcefff',
		sunDisc: '#fff6d8',
		hemiSky: '#ffffff',
		hemiGround: '#a8d48f',
		hemiIntensity: 1.4,
		keyLight: '#fff1d6',
		keyIntensity: 1.6,
		grassNear: '#6fbf5a',
		grassFar: '#a5d48a',
		mountains: '#8fa9c4',
		canopy: '#4f9a4a',
		trunk: '#7a5a3c',
		cloud: '#ffffff',
		fog: '#dcefff',
		fogNear: 120,
		fogFar: 480,
		stars: false,
		fireflies: false,
	},
	dark: {
		skyTop: '#1a1d48',
		skyHorizon: '#e09a7e',
		sunDisc: '#f4f1ff',
		hemiSky: '#5a64a8',
		hemiGround: '#1c3a34',
		hemiIntensity: 0.8,
		keyLight: '#ffb38a',
		keyIntensity: 0.7,
		grassNear: '#2e5a4a',
		grassFar: '#4a5f6e',
		mountains: '#5b4a7a',
		canopy: '#244a40',
		trunk: '#3d2e2a',
		cloud: '#b9a3c9',
		fog: '#8e6f95',
		fogNear: 100,
		fogFar: 460,
		stars: true,
		fireflies: true,
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
