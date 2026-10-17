export interface StepRect {
	readonly top: number;
	readonly bottom: number;
}

/** Index of the step containing the viewport's vertical middle; otherwise the nearest one (earlier wins ties). -1 for no steps. */
export const activeStep = (rects: readonly StepRect[], viewportHeight: number): number => {
	const middle = viewportHeight / 2;
	let best = -1;
	let bestDistance = Infinity;
	rects.forEach(({ top, bottom }, index) => {
		const distance = middle < top ? top - middle : middle > bottom ? middle - bottom : 0;
		if (distance < bestDistance) {
			best = index;
			bestDistance = distance;
		}
	});
	return best;
};
