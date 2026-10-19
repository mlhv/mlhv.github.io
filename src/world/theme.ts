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
		hemiGround: '#d6e0b4',
		hemiIntensity: 1.4,
		keyLight: '#fff1d6',
		keyIntensity: 1.6,
		grassNear: '#6fbf5a',
		grassFar: '#a5d48a',
		mountains: '#8fa9c4',
		canopy: '#64a85a',
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
		hemiSky: '#8f94d6',
		hemiGround: '#6a5a6e',
		hemiIntensity: 1.5,
		keyLight: '#ffb38a',
		keyIntensity: 1.1,
		grassNear: '#467e6a',
		grassFar: '#62708a',
		mountains: '#5b4a7a',
		canopy: '#47766a',
		trunk: '#5c463e',
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
