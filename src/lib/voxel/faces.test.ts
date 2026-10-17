import { describe, expect, it } from 'vitest';
import { FACES, visibleFaces } from './faces';

const v = (x: number, y: number, z: number) => ({ x, y, z, color: '#000000' });

describe('visibleFaces', () => {
	it('shows all six faces of a lone voxel', () => {
		expect(visibleFaces([v(0, 0, 0)])).toHaveLength(6);
	});

	it('hides the shared faces of two neighbours', () => {
		expect(visibleFaces([v(0, 0, 0), v(1, 0, 0)])).toHaveLength(10);
	});

	it('shows only the outer shell of a solid 3×3×3 cube', () => {
		const cube = [];
		for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) for (let z = 0; z < 3; z++) cube.push(v(x, y, z));
		expect(visibleFaces(cube)).toHaveLength(9 * 6);
	});

	it('emits faces once for duplicate positions (no z-fighting when props overlap)', () => {
		expect(visibleFaces([v(0, 0, 0), { ...v(0, 0, 0), color: '#ffffff' }])).toHaveLength(6);
	});
});

describe('FACES', () => {
	it('has one unit normal per axis direction', () => {
		const dirs = FACES.map((f) => f.dir.join(','));
		expect(new Set(dirs)).toEqual(new Set(['-1,0,0', '1,0,0', '0,-1,0', '0,1,0', '0,0,-1', '0,0,1']));
	});
});
