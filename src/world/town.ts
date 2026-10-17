import {
	BufferGeometry,
	Float32BufferAttribute,
	Group,
	Mesh,
	MeshBasicMaterial,
	MeshLambertMaterial,
	PlaneGeometry,
	Points,
	PointsMaterial,
} from 'three';
import { buildVoxelGeometry, buildVoxelMesh } from '../lib/voxel/mesh';
import { offsetVoxels, parseVoxelModel, type Voxel } from '../lib/voxel/model';
import { PLACEMENTS } from './buildings';
import { BLOCK, GRID_D, GRID_W, ORIGIN_X, ORIGIN_Z, surfaceY, terrainAt, type Surface } from './terrain';

export interface Town {
	group: Group;
	seaMaterial: MeshLambertMaterial;
	windowMaterial: MeshBasicMaterial;
	stars: Points;
}

const TOP: Record<Exclude<Surface, 'sea' | 'pond'>, string> = {
	grass: '#7cc46a',
	sand: '#e9d8a6',
	path: '#d8c48f',
	cliff: '#7cc46a',
};
const DIRT = '#8a6a4a';
const STONE = '#9a9590';

/** Terrain columns in grid units, two dirt blocks deep below sea level. */
const terrainVoxels = (): Voxel[] => {
	const voxels: Voxel[] = [];
	for (let gx = 0; gx < GRID_W; gx++) {
		for (let gz = 0; gz < GRID_D; gz++) {
			const { height, surface } = terrainAt(gx, gz);
			if (surface === 'sea') continue;
			for (let y = -2; y < height; y++) {
				const top = y === height - 1 && surface !== 'pond';
				const color = top ? TOP[surface as keyof typeof TOP] : surface === 'cliff' && y >= 1 ? STONE : DIRT;
				voxels.push({ x: gx, y, z: gz, color });
			}
		}
	}
	return voxels;
};

/** A fixed, seeded dome of stars so every visit sees the same sky. */
const buildStars = (): Points => {
	let seed = 7;
	const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
	const positions: number[] = [];
	for (let i = 0; i < 400; i++) {
		const theta = rand() * Math.PI * 2;
		const phi = rand() * Math.PI * 0.45;
		positions.push(450 * Math.sin(phi) * Math.cos(theta), 450 * Math.cos(phi), 450 * Math.sin(phi) * Math.sin(theta));
	}
	const geometry = new BufferGeometry();
	geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
	return new Points(geometry, new PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, fog: false }));
};

export const buildTown = (): Town => {
	const group = new Group();

	const terrain = buildVoxelMesh(terrainVoxels(), { scale: BLOCK, center: false });
	terrain.position.set(ORIGIN_X, 0, ORIGIN_Z);

	const seaMaterial = new MeshLambertMaterial();
	const sea = new Mesh(new PlaneGeometry(1200, 1200).rotateX(-Math.PI / 2), seaMaterial);
	sea.position.y = 1;

	const props: Voxel[] = [];
	const windows: Voxel[] = [];
	for (const { building, at: [x, z] } of PLACEMENTS) {
		const y = surfaceY(x, z);
		props.push(...offsetVoxels(parseVoxelModel(building.model), x, y, z));
		if (building.windows) windows.push(...offsetVoxels(parseVoxelModel(building.windows), x, y, z));
	}
	const windowMaterial = new MeshBasicMaterial();
	const stars = buildStars();

	group.add(
		terrain,
		sea,
		buildVoxelMesh(props, { center: false }),
		new Mesh(buildVoxelGeometry(windows, { center: false }), windowMaterial),
		stars,
	);
	return { group, seaMaterial, windowMaterial, stars };
};
