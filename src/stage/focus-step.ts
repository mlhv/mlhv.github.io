import type { StepRect } from './active-step';

/**
 * The Step a keyboard-focused element votes for: its own Step while the element is fully inside the viewport,
 * otherwise `fallback`. A stale focus (a clicked link scrolled away) therefore stops pinning the Stage.
 */
export const focusStep = (
	focusedStep: number,
	focusedRect: StepRect,
	viewportHeight: number,
	fallback: number,
): number => (focusedStep >= 0 && focusedRect.top >= 0 && focusedRect.bottom <= viewportHeight ? focusedStep : fallback);
