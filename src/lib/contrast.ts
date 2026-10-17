export type Rgb = readonly [number, number, number];

export const parseHex = (hex: string): Rgb => {
	const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
	if (!match) throw new Error(`Not a 6-digit hex colour: ${hex}`);
	const n = Number.parseInt(match[1], 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const channel = (c: number) => {
	const s = c / 255;
	return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

/** WCAG 2 relative luminance. */
export const luminance = ([r, g, b]: Rgb): number => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

/** WCAG 2 contrast ratio, 1–21, order-independent. */
export const contrastRatio = (a: Rgb, b: Rgb): number => {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
};

/** `fg` at `alpha` painted over an opaque `bg`, rounded to whole channels. */
export const composite = (fg: Rgb, alpha: number, bg: Rgb): Rgb =>
	fg.map((c, i) => Math.round(c * alpha + bg[i] * (1 - alpha))) as unknown as Rgb;
