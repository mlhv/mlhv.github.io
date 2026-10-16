import { describe, expect, it } from 'vitest';
import { resolveTheme } from './theme';

describe('resolveTheme', () => {
	it('falls back to the system preference when there is no stored preference (light)', () => {
		expect(resolveTheme(null, false)).toBe('light');
	});

	it('falls back to the system preference when there is no stored preference (dark)', () => {
		expect(resolveTheme(null, true)).toBe('dark');
	});

	it('uses the stored preference over the system preference when both are present', () => {
		expect(resolveTheme('light', true)).toBe('light');
		expect(resolveTheme('dark', false)).toBe('dark');
	});
});
