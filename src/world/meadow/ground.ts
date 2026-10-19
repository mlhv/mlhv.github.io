import { Color, ConeGeometry, Float32BufferAttribute, Group, InstancedMesh, Mesh, MeshLambertMaterial, Object3D, PlaneGeometry } from 'three';
import { CAMERA, GROUND, MOUNTAINS, groundShade, heightAt } from './layout';
import type { MeadowPalette } from './palette';

export interface Ground {
	group: Group;
	applyTheme: (palette: MeadowPalette) => void;
}

/** Flat-shaded hills from heightAt, and the mountain ring along the horizon. */
export const buildGround = (): Ground => {
	const plane = new PlaneGeometry(GROUND.width, GROUND.depth, GROUND.segmentsX, GROUND.segmentsZ)
		.rotateX(-Math.PI / 2)
		.translate(0, 0, GROUND.centerZ);
	const geometry = plane.toNonIndexed();
	plane.dispose();
	const position = geometry.getAttribute('position');
	// How far toward grassFar each vertex is; fixed, so a theme change only re-mixes colours.
	const shade = new Float32Array(position.count);
	for (let i = 0; i < position.count; i++) {
		const x = position.getX(i);
		const z = position.getZ(i);
		position.setY(i, heightAt(x, z));
		shade[i] = groundShade(Math.hypot(x - CAMERA.position[0], z - CAMERA.position[2]));
	}
	geometry.computeVertexNormals();
	geometry.setAttribute('color', new Float32BufferAttribute(new Float32Array(position.count * 3), 3));
	const ground = new Mesh(geometry, new MeshLambertMaterial({ vertexColors: true, flatShading: true }));
	ground.name = 'ground';

	const mountainMaterial = new MeshLambertMaterial({ flatShading: true });
	const mountains = new InstancedMesh(new ConeGeometry(1, 1, 6).translate(0, 0.5, 0), mountainMaterial, MOUNTAINS.length);
	mountains.name = 'mountains';
	const dummy = new Object3D();
	MOUNTAINS.forEach((peak, i) => {
		dummy.position.set(peak.x, 0, peak.z);
		dummy.rotation.set(0, peak.turn, 0);
		dummy.scale.set(peak.radius, peak.height, peak.radius);
		dummy.updateMatrix();
		mountains.setMatrixAt(i, dummy.matrix);
	});

	const group = new Group();
	group.add(ground, mountains);
	const near = new Color();
	const far = new Color();
	const mixed = new Color();
	return {
		group,
		applyTheme: (palette) => {
			near.set(palette.grassNear);
			far.set(palette.grassFar);
			const color = geometry.getAttribute('color');
			for (let i = 0; i < color.count; i++) {
				mixed.lerpColors(near, far, shade[i]);
				color.setXYZ(i, mixed.r, mixed.g, mixed.b);
			}
			color.needsUpdate = true;
			mountainMaterial.color.set(palette.mountains);
		},
	};
};
