// How much grass a device draws, and when to draw less. Pure logic; main.ts feeds it the device and the frames.

export type Tier = 'low' | 'medium' | 'high';

export const TIERS: Record<Tier, { blades: number; pixelRatio: number; fps: number }> = {
	high: { blades: 60000, pixelRatio: 2, fps: 60 },
	medium: { blades: 25000, pixelRatio: 1.5, fps: 60 },
	low: { blades: 8000, pixelRatio: 1, fps: 30 },
};

export interface DeviceHints {
	/** Phones and tablets. */
	coarsePointer: boolean;
	/** navigator.hardwareConcurrency. */
	cores?: number;
	/** navigator.deviceMemory; Chromium only, so a missing value is not a weak device. */
	memoryGB?: number;
}

/** The starting tier. Missing hints are ignored, never counted against the device. */
export const pickTier = ({ coarsePointer, cores, memoryGB }: DeviceHints): Tier => {
	if ((cores !== undefined && cores <= 4) || (memoryGB !== undefined && memoryGB <= 4)) return 'low';
	return coarsePointer ? 'medium' : 'high';
};

/** Slower than about 45 fps. */
export const SLOW_FRAME_MS = 22;

const LOWER: Record<Tier, Tier> = { high: 'medium', medium: 'low', low: 'low' };

/** One tier lower when the average frame is slow; never higher. */
export const nextTier = (tier: Tier, averageMs: number): Tier => (averageMs > SLOW_FRAME_MS ? LOWER[tier] : tier);

/** Frames ignored while shaders compile and the first models settle. */
export const WARMUP_FRAMES = 30;
export const WINDOW_SECONDS = 3;
/** A longer frame is a pause (hidden tab, GC), not a measure of drawing speed. */
const MAX_SAMPLE_MS = 250;

export interface FrameMonitor {
	frames: number;
	/** Seconds on the caller's clock when the current window opened. */
	start: number;
	total: number;
	count: number;
}

export const newMonitor = (): FrameMonitor => ({ frames: 0, start: 0, total: 0, count: 0 });

/** Feeds one frame: its length in ms and the clock in seconds. Returns the window's average once it closes, then opens a new window. */
export const recordFrame = (monitor: FrameMonitor, ms: number, now: number): { monitor: FrameMonitor; average: number | null } => {
	if (monitor.frames < WARMUP_FRAMES) return { monitor: { ...monitor, frames: monitor.frames + 1, start: now }, average: null };
	const next = ms > MAX_SAMPLE_MS ? monitor : { ...monitor, total: monitor.total + ms, count: monitor.count + 1 };
	if (now - monitor.start < WINDOW_SECONDS) return { monitor: next, average: null };
	const fresh = { frames: monitor.frames, start: now, total: 0, count: 0 };
	return { monitor: fresh, average: next.count > 0 ? next.total / next.count : null };
};

/** `?world=low|medium|high` (dev only; main.ts checks import.meta.env.DEV). */
export const tierOverride = (search: string): Tier | null => {
	const value = new URLSearchParams(search).get('world');
	return value === 'low' || value === 'medium' || value === 'high' ? value : null;
};

/**
 * The draw throttle. Given ms since the last draw slot and the tier's fps, returns how far to advance
 * that slot, or null to skip this rAF. Tiers at 60 fps or more draw every callback (the screen paces them);
 * lower tiers advance by whole frame intervals so leftover time carries and a 75 or 144 Hz screen still gets ~30 fps.
 */
export const drawDue = (sinceLastDraw: number, fps: number): number | null => {
	if (fps >= 60) return sinceLastDraw;
	const interval = 1000 / fps;
	if (sinceLastDraw < interval - 1) return null;
	return Math.min(sinceLastDraw, interval * Math.floor((sinceLastDraw + 1) / interval)); // whole intervals only: never bursts to catch up
};
