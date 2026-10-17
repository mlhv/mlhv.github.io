import { describe, expect, it } from 'vitest';
import { modelFromBoxes, offsetVoxels, parseVoxelModel } from './model';

describe('parseVoxelModel', () => {
	it('maps layer → y, row → z, column → x, skipping "." and spaces', () => {
		const voxels = parseVoxelModel({
			palette: { a: '#ff0000', b: '#00ff00' },
			layers: [['a.', ' b'], ['..', '.a']],
		});
		expect(voxels).toEqual([
			{ x: 0, y: 0, z: 0, color: '#ff0000' },
			{ x: 1, y: 0, z: 1, color: '#00ff00' },
			{ x: 1, y: 1, z: 1, color: '#ff0000' },
		]);
	});

	it('accepts rows and layers of uneven length', () => {
		const voxels = parseVoxelModel({ palette: { a: '#000000' }, layers: [['aaa', 'a'], ['a']] });
		expect(voxels).toHaveLength(5);
	});

	it('throws with the location of an unknown palette key', () => {
		expect(() => parseVoxelModel({ palette: { a: '#000000' }, layers: [['a'], ['.z']] })).toThrow(
			'Unknown palette key "z" at layer 1, row 0, column 1',
		);
	});

	it('returns no voxels for an empty model', () => {
		expect(parseVoxelModel({ palette: {}, layers: [] })).toEqual([]);
	});
});

describe('modelFromBoxes', () => {
	const palette = { a: '#111111', b: '#222222' };

	it('fills inclusive boxes', () => {
		const voxels = parseVoxelModel(modelFromBoxes(palette, [[0, 0, 0, 1, 2, 3, 'a']]));
		expect(voxels).toHaveLength(2 * 3 * 4);
	});

	it('lets later boxes overwrite earlier ones and "." carve', () => {
		const model = modelFromBoxes(palette, [
			[0, 0, 0, 2, 0, 0, 'a'],
			[1, 0, 0, 1, 0, 0, 'b'],
			[2, 0, 0, 2, 0, 0, '.'],
		]);
		expect(model.layers).toEqual([['ab']]);
	});

	it('throws on negative or inverted boxes', () => {
		expect(() => modelFromBoxes(palette, [[-1, 0, 0, 0, 0, 0, 'a']])).toThrow('Box 0');
		expect(() => modelFromBoxes(palette, [[2, 0, 0, 1, 0, 0, 'a']])).toThrow('Box 0');
	});

	it('throws on an unknown key', () => {
		expect(() => modelFromBoxes(palette, [[0, 0, 0, 0, 0, 0, 'q']])).toThrow('Box 0 uses unknown palette key "q"');
	});

	it('returns an empty model for no boxes', () => {
		expect(modelFromBoxes(palette, [])).toEqual({ palette, layers: [] });
	});
});

describe('offsetVoxels', () => {
	it('shifts every voxel without mutating the input', () => {
		const input = [{ x: 1, y: 2, z: 3, color: '#000000' }];
		expect(offsetVoxels(input, 10, 20, 30)).toEqual([{ x: 11, y: 22, z: 33, color: '#000000' }]);
		expect(input[0].x).toBe(1);
	});
});
