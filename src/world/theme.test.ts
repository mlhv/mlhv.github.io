import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PRESETS } from './theme';

const css = readFileSync(fileURLToPath(new URL('../styles/theme.css', import.meta.url)), 'utf8');
/** Every value of a --color-world-* token, in file order: the light :root block, then the two dark blocks. */
const tokens = (name: 'sky' | 'ground') =>
	[...css.matchAll(new RegExp(`--color-world-${name}:\\s*(#[0-9a-fA-F]{6})`, 'g'))].map((match) => match[1].toLowerCase());

describe('PRESETS', () => {
	it.each(Object.entries(PRESETS))('%s colours are 6-digit lowercase hex', (_, preset) => {
		for (const [field, value] of Object.entries(preset)) {
			if (typeof value === 'string') expect(value, field).toMatch(/^#[0-9a-f]{6}$/);
		}
	});

	it('shows the dusk extras only in dark mode', () => {
		expect(PRESETS.light.stars || PRESETS.light.fireflies).toBe(false);
		expect(PRESETS.dark.stars && PRESETS.dark.fireflies).toBe(true);
	});

	it('the CSS fallback gradient matches each preset (light first, then both dark blocks)', () => {
		expect(tokens('sky')).toEqual([PRESETS.light.skyHorizon, PRESETS.dark.skyHorizon, PRESETS.dark.skyHorizon]);
		expect(tokens('ground')).toEqual([PRESETS.light.grassNear, PRESETS.dark.grassNear, PRESETS.dark.grassNear]);
	});
});
