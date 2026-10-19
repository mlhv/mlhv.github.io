/** Every colour and light the meadow uses for one theme. src/world/theme.ts holds the day and dusk values. */
export interface MeadowPalette {
	skyTop: string;
	/** Also the CSS fallback's --color-world-sky. */
	skyHorizon: string;
	/** The sun by day, the moon at dusk. */
	sunDisc: string;
	hemiSky: string;
	hemiGround: string;
	hemiIntensity: number;
	/** The directional light from the sun's side. */
	keyLight: string;
	keyIntensity: number;
	/** Also the CSS fallback's --color-world-ground. */
	grassNear: string;
	grassFar: string;
	mountains: string;
	canopy: string;
	trunk: string;
	cloud: string;
	fog: string;
	fogNear: number;
	fogFar: number;
	stars: boolean;
	fireflies: boolean;
}
