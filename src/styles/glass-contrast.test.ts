import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { composite, contrastRatio, parseHex, type Rgb } from '../lib/contrast';

const css = readFileSync(new URL('./theme.css', import.meta.url), 'utf8');

const token = (name: string): string => {
	const match = new RegExp(`--${name}:\\s*([^;]+);`).exec(css);
	if (!match) throw new Error(`theme.css has no --${name}`);
	return match[1].trim();
};

const glass = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/.exec(token('color-glass'));
if (!glass) throw new Error('--color-glass must be rgba(r, g, b, a)');
const fill: Rgb = [Number(glass[1]), Number(glass[2]), Number(glass[3])];
const alpha = Number(glass[4]);

// The World can show pure white (sky, snow, bright fog) behind a card, so test the glass over white: the worst case for light text.
const worstCase = composite(fill, alpha, [255, 255, 255]);

describe('glass card contrast (WCAG AA)', () => {
	it.each(['color-on-glass', 'color-glass-muted', 'color-glass-accent'])('%s on glass over white is at least 4.5:1', (name) => {
		expect(contrastRatio(parseHex(token(name)), worstCase)).toBeGreaterThanOrEqual(4.5);
	});
});
