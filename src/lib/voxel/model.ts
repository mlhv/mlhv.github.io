/**
 * A Voxel Model: a palette plus text layer grids. `layers[y][z][x]`, layers bottom-up,
 * rows back (z = 0) to front. "." or " " is an empty cell.
 */
export interface VoxelModel {
	palette: Readonly<Record<string, string>>;
	layers: readonly (readonly string[])[];
}

export interface Voxel {
	x: number;
	y: number;
	z: number;
	color: string;
}

/** Inclusive box `[x0, y0, z0, x1, y1, z1, key]`; key "." carves. */
export type Box = readonly [x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, key: string];

export const EMPTY = '.';

const isEmpty = (key: string) => key === EMPTY || key === ' ';

export const parseVoxelModel = (model: VoxelModel): Voxel[] => {
	const voxels: Voxel[] = [];
	model.layers.forEach((rows, y) =>
		rows.forEach((row, z) =>
			[...row].forEach((key, x) => {
				if (isEmpty(key)) return;
				const color = model.palette[key];
				if (!color) throw new Error(`Unknown palette key "${key}" at layer ${y}, row ${z}, column ${x}`);
				voxels.push({ x, y, z, color });
			}),
		),
	);
	return voxels;
};

/** Builds a model by painting boxes in order; later boxes win. Coordinates must be non-negative. */
export const modelFromBoxes = (palette: Readonly<Record<string, string>>, boxes: readonly Box[]): VoxelModel => {
	let width = 0;
	let height = 0;
	let depth = 0;
	boxes.forEach(([x0, y0, z0, x1, y1, z1, key], index) => {
		if (Math.min(x0, y0, z0) < 0 || x1 < x0 || y1 < y0 || z1 < z0) {
			throw new Error(`Box ${index} must have non-negative, non-inverted bounds`);
		}
		if (!isEmpty(key) && !palette[key]) throw new Error(`Box ${index} uses unknown palette key "${key}"`);
		width = Math.max(width, x1 + 1);
		height = Math.max(height, y1 + 1);
		depth = Math.max(depth, z1 + 1);
	});

	const grid = Array.from({ length: height }, () =>
		Array.from({ length: depth }, () => Array.from({ length: width }, () => EMPTY)),
	);
	for (const [x0, y0, z0, x1, y1, z1, key] of boxes) {
		for (let y = y0; y <= y1; y++)
			for (let z = z0; z <= z1; z++)
				for (let x = x0; x <= x1; x++) grid[y][z][x] = isEmpty(key) ? EMPTY : key;
	}
	return { palette, layers: grid.map((rows) => rows.map((row) => row.join('').replace(/\.+$/, ''))) };
};

export const offsetVoxels = (voxels: readonly Voxel[], dx: number, dy: number, dz: number): Voxel[] =>
	voxels.map((voxel) => ({ ...voxel, x: voxel.x + dx, y: voxel.y + dy, z: voxel.z + dz }));
