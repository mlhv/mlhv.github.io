import { existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { formatBytes, MAX_MODEL_BYTES } from '../lib/models';
import { cast } from './characters';

const dir = fileURLToPath(new URL('../../public/models/', import.meta.url));
const files = existsSync(dir) ? readdirSync(dir).filter((name) => !name.startsWith('.')) : [];

describe('public/models', () => {
	it('holds only optimised .glb files within the budget', () => {
		for (const name of files) {
			expect(name, `${name} is not a .glb`).toMatch(/\.glb$/);
			const size = statSync(dir + name).size;
			expect(size, `${name} is ${formatBytes(size)}`).toBeLessThanOrEqual(MAX_MODEL_BYTES);
		}
	});

	it('holds no model that no Cast Member uses', () => {
		for (const name of files) expect(cast.some((m) => m.source?.url === `/models/${name}`), `${name} is unused`).toBe(true);
	});
});
