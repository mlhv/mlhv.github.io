import { describe, expect, it } from 'vitest';
import { activeStep } from './active-step';

// Three 1000px-tall steps with 100px gaps, scrolled so the viewport (800px) starts at `scroll`.
const rects = (scroll: number) =>
	[0, 1100, 2200].map((top) => ({ top: top - scroll, bottom: top + 1000 - scroll }));

describe('activeStep', () => {
	it('picks the step containing the viewport middle', () => {
		expect(activeStep(rects(0), 800)).toBe(0); // middle at 400
		expect(activeStep(rects(1000), 800)).toBe(1); // middle at 1400
	});

	it('keeps a step taller than the viewport active while scrolling inside it', () => {
		for (let scroll = 700; scroll <= 1700; scroll += 50) expect(activeStep(rects(scroll), 800)).toBe(1);
	});

	it('picks the nearest step when the middle is in a gap', () => {
		expect(activeStep(rects(630), 800)).toBe(0); // middle at 1030: 30 below step 0, 70 above step 1
		expect(activeStep(rects(670), 800)).toBe(1); // middle at 1070: 70 below step 0, 30 above step 1
	});

	it('breaks an exact tie towards the earlier step', () => {
		expect(activeStep(rects(650), 800)).toBe(0); // middle at 1050: 50 from each
	});

	it('clamps above the first and below the last step', () => {
		expect(activeStep(rects(-2000), 800)).toBe(0);
		expect(activeStep(rects(9000), 800)).toBe(2);
	});

	it('returns -1 when there are no steps', () => {
		expect(activeStep([], 800)).toBe(-1);
	});
});
