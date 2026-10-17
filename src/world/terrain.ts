/** The island is a GRID_W × GRID_D grid of BLOCK-sized columns, centred on the world origin. */
export const BLOCK = 4;
export const GRID_W = 48;
export const GRID_D = 30;
export const ORIGIN_X = -(GRID_W / 2) * BLOCK;
export const ORIGIN_Z = -(GRID_D / 2) * BLOCK;

export type Surface = 'sea' | 'pond' | 'sand' | 'grass' | 'path' | 'cliff';

const SEA = { height: 0, surface: 'sea' } as const;

/** Column height (in blocks) and surface at grid cell (gx, gz). */
export const terrainAt = (gx: number, gz: number): { height: number; surface: Surface } => {
	if (gx < 0 || gz < 0 || gx >= GRID_W || gz >= GRID_D) return SEA;
	const edge = ((gx - 23.5) / 23) ** 2 + ((gz - 14.5) / 14) ** 2;
	if (edge > 1) return SEA;
	if ((gx - 20) ** 2 + (gz - 20) ** 2 <= 6) return { height: 0, surface: 'pond' };
	if (edge > 0.82) return { height: 1, surface: 'sand' };
	if (gx >= 40) return { height: 5, surface: 'cliff' };
	if (gz === 15 || gz === 16) return { height: 1, surface: 'path' };
	return { height: 1, surface: 'grass' };
};

const cellOf = (x: number, z: number) =>
	[Math.floor((x - ORIGIN_X) / BLOCK), Math.floor((z - ORIGIN_Z) / BLOCK)] as const;

/** World-space y of the ground top at world (x, z). */
export const surfaceY = (x: number, z: number): number => terrainAt(...cellOf(x, z)).height * BLOCK;

export const isLand = (x: number, z: number): boolean => {
	const { surface } = terrainAt(...cellOf(x, z));
	return surface !== 'sea' && surface !== 'pond';
};
