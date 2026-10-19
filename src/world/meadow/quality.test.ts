import { describe, expect, it } from 'vitest';
import {
	SLOW_FRAME_MS,
	TIERS,
	WARMUP_FRAMES,
	drawDue,
	newMonitor,
	nextTier,
	pickTier,
	recordFrame,
	tierOverride,
	type DeviceHints,
	type FrameMonitor,
	type Tier,
} from './quality';

describe('TIERS', () => {
	it('matches the spec', () => {
		expect(TIERS).toEqual({
			high: { blades: 60000, pixelRatio: 2, fps: 60 },
			medium: { blades: 25000, pixelRatio: 1.5, fps: 60 },
			low: { blades: 8000, pixelRatio: 1, fps: 30 },
		});
	});
});

describe('pickTier', () => {
	it.each<[DeviceHints, Tier]>([
		[{ coarsePointer: false, cores: 8, memoryGB: 8 }, 'high'],
		[{ coarsePointer: false, cores: 8 }, 'high'], // Safari and Firefox expose no deviceMemory
		[{ coarsePointer: false }, 'high'],
		[{ coarsePointer: true, cores: 8, memoryGB: 6 }, 'medium'],
		[{ coarsePointer: true }, 'medium'],
		[{ coarsePointer: false, cores: 4, memoryGB: 8 }, 'low'],
		[{ coarsePointer: false, cores: 8, memoryGB: 4 }, 'low'],
		[{ coarsePointer: true, cores: 4 }, 'low'],
	])('%o starts at %s', (hints, tier) => {
		expect(pickTier(hints)).toBe(tier);
	});
});

describe('nextTier', () => {
	it('keeps the tier at or under the slow-frame threshold', () => {
		expect(nextTier('high', 16.7)).toBe('high');
		expect(nextTier('high', SLOW_FRAME_MS)).toBe('high');
	});

	it('drops one tier when frames are slow, and stops at low', () => {
		expect(nextTier('high', 30)).toBe('medium');
		expect(nextTier('medium', 30)).toBe('low');
		expect(nextTier('low', 30)).toBe('low');
	});
});

describe('recordFrame', () => {
	/** Feeds frames of `ms` until the window closes; returns the average and how many frames that took. */
	const run = (monitor: FrameMonitor, ms: number, now: number, extra?: (i: number) => number | null) => {
		let m = monitor;
		let t = now;
		for (let i = 0; i < 1000; i++) {
			const sample = extra?.(i) ?? ms;
			t += ms / 1000;
			const result = recordFrame(m, sample, t);
			m = result.monitor;
			if (result.average !== null) return { average: result.average, frames: i + 1, monitor: m, now: t };
		}
		throw new Error('window never closed');
	};

	it('skips the warm-up frames, then averages a 3-second window', () => {
		const { average, frames } = run(newMonitor(), 16, 0);
		expect(average).toBeCloseTo(16, 6);
		expect(frames).toBeGreaterThan(WARMUP_FRAMES + 180);
	});

	it('ignores a frame longer than 250 ms, like the gap after a hidden tab', () => {
		const { average } = run(newMonitor(), 16, 0, (i) => (i === WARMUP_FRAMES + 20 ? 5000 : null));
		expect(average).toBeCloseTo(16, 6);
	});

	it('starts a fresh window after reporting', () => {
		const first = run(newMonitor(), 16, 0);
		const second = run(first.monitor, 30, first.now);
		expect(second.average).toBeCloseTo(30, 6);
	});
});

describe('tierOverride', () => {
	it('reads ?world=low|medium|high and nothing else', () => {
		expect(tierOverride('?world=low')).toBe('low');
		expect(tierOverride('?a=1&world=high')).toBe('high');
		expect(tierOverride('?world=ultra')).toBeNull();
		expect(tierOverride('')).toBeNull();
	});
});

describe('drawDue', () => {
	/** Draws counted over 2 s of rAF callbacks at a given refresh rate, throttled like main.ts. */
	const simulate = (hz: number, fps: number) => {
		const step = 1000 / hz;
		let lastDrawn = 0;
		let draws = 0;
		let callbacks = 0;
		for (let now = step; now <= 2000 + 1e-6; now += step) {
			callbacks++;
			const advance = drawDue(now - lastDrawn, fps);
			if (advance === null) continue;
			lastDrawn += advance;
			draws++;
		}
		return { draws, callbacks };
	};

	for (const hz of [60, 75, 144]) {
		it(`draws every callback at 60 fps on ${hz} Hz`, () => {
			const { draws, callbacks } = simulate(hz, 60);
			expect(draws).toBe(callbacks);
		});
		it(`draws about 30 fps at the 30 fps tier on ${hz} Hz`, () => {
			const { draws } = simulate(hz, 30);
			expect(Math.abs(draws / 2 - 30)).toBeLessThanOrEqual(1.5);
		});
	}

	it('never advances by more than the time since the last draw', () => {
		expect(drawDue(500, 30)).toBeLessThanOrEqual(500);
		expect(drawDue(10, 30)).toBeNull();
	});
});
