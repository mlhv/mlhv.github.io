import {
	Box3,
	CircleGeometry,
	Color,
	DirectionalLight,
	Fog,
	HemisphereLight,
	Mesh,
	MeshBasicMaterial,
	PerspectiveCamera,
	PointLight,
	Points,
	Scene,
	Vector3,
	WebGLRenderer,
	type Material,
	type Object3D,
} from 'three';
import { cameraAt, scrollProgress } from './camera-path';
import type { CastMember } from './cast';
import { cast } from './characters';
import { idlePose } from './idle';
import { loadCharacter } from './load-character';
import { surfaceY } from './terrain';
import { PRESETS, documentTheme, watchTheme, type WorldTheme } from './theme';
import { buildTown } from './town';

export interface WorldOptions {
	reducedMotion: boolean;
}

export interface WorldHooks {
	onPick?: (id: string) => void;
}

interface Actor {
	member: CastMember;
	object: Object3D;
	shadow: Mesh;
	seed: number;
	/** Seconds since start when the last hop began. */
	hopStart: number;
}

const disposeScene = (scene: Scene) =>
	scene.traverse((node) => {
		if (node instanceof Mesh || node instanceof Points) {
			node.geometry.dispose();
			const materials: Material[] = Array.isArray(node.material) ? node.material : [node.material];
			for (const material of materials) material.dispose();
		}
	});

const pageProgress = () => scrollProgress(window.scrollY, document.documentElement.scrollHeight, window.innerHeight);

/** Builds the World into `canvas` and starts it. Resolves to a stop function that frees every GPU resource. */
export const startWorld = async (
	canvas: HTMLCanvasElement,
	_bubble: HTMLElement,
	options: WorldOptions,
): Promise<() => void> => {
	const renderer = new WebGLRenderer({ canvas, antialias: true });
	const coarse = window.matchMedia('(pointer: coarse)').matches;
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, coarse ? 1.5 : 2));

	const scene = new Scene();
	const fog = new Fog(0xffffff, 140, 320);
	scene.fog = fog;
	const camera = new PerspectiveCamera(40, 1, 1, 1000);
	const hemi = new HemisphereLight();
	const sun = new DirectionalLight();
	sun.position.set(-60, 120, 80);
	scene.add(hemi, sun);

	const town = buildTown();
	scene.add(town.group);

	const shadowGeometry = new CircleGeometry(1, 20);
	const shadowMaterial = new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false });
	const size = new Vector3();
	const actors: Actor[] = await Promise.all(
		cast.map(async (member, index) => {
			const object = await loadCharacter(member.source);
			new Box3().setFromObject(object).getSize(size);
			const shadow = new Mesh(shadowGeometry, shadowMaterial);
			shadow.rotation.x = -Math.PI / 2;
			shadow.scale.setScalar(Math.max(size.x, size.z) * 0.45);
			scene.add(object, shadow);
			return { member, object, shadow, seed: index * 1.7, hopStart: -Infinity };
		}),
	);

	const gengarGlow = new PointLight(0xb388ff, 0, 40);
	gengarGlow.position.set(0, 8, 4);
	actors.find((actor) => actor.member.id === 'gengar')?.object.add(gengarGlow);

	const applyTheme = (theme: WorldTheme) => {
		const preset = PRESETS[theme];
		scene.background = new Color(preset.sky);
		fog.color.set(preset.sky);
		hemi.color.set(preset.hemiSky);
		hemi.groundColor.set(preset.hemiGround);
		hemi.intensity = preset.hemiIntensity;
		sun.color.set(preset.sun);
		sun.intensity = preset.sunIntensity;
		town.seaMaterial.color.set(preset.sea);
		town.windowMaterial.color.set(preset.glow);
		town.stars.visible = preset.stars;
		gengarGlow.intensity = preset.gengarGlow;
	};

	const resize = () => {
		const { innerWidth: w, innerHeight: h } = window;
		renderer.setSize(w, h, false);
		camera.aspect = w / h;
		camera.fov = w < h ? 55 : 40;
		camera.updateProjectionMatrix();
	};

	let progress = options.reducedMotion ? 0 : pageProgress();
	const aimCamera = () => {
		const { position, target } = cameraAt(progress);
		camera.position.set(...position);
		camera.lookAt(...target);
	};

	const place = (actor: Actor, t: number) => {
		const [baseX, baseZ] = actor.member.position;
		const pose = idlePose(actor.member.idle, options.reducedMotion ? 0 : t, options.reducedMotion ? 0 : actor.seed);
		const x = baseX + pose.dx;
		const z = baseZ + pose.dz;
		const ground = surfaceY(x, z);
		actor.object.position.set(x, ground + pose.dy, z);
		actor.object.rotation.set(0, pose.heading ?? actor.member.facing, pose.sway);
		actor.shadow.position.set(x, ground + 0.05, z);
	};

	const render = () => renderer.render(scene, camera);

	const start = performance.now();
	let last = start;
	let frame = 0;
	const tick = (now: number) => {
		frame = requestAnimationFrame(tick);
		const dt = Math.min(0.1, (now - last) / 1000);
		last = now;
		if (document.hidden) return;
		const t = (now - start) / 1000;
		progress += (pageProgress() - progress) * Math.min(1, dt * 6);
		aimCamera();
		for (const actor of actors) place(actor, t);
		render();
	};

	resize();
	applyTheme(documentTheme());
	aimCamera();
	for (const actor of actors) place(actor, 0);

	const stopTheme = watchTheme((theme) => {
		applyTheme(theme);
		if (options.reducedMotion) render();
	});
	const onResize = () => {
		resize();
		if (options.reducedMotion) render();
	};
	window.addEventListener('resize', onResize);

	if (options.reducedMotion) render();
	else frame = requestAnimationFrame(tick);
	canvas.classList.add('ready');
	performance.mark('world:start');

	return () => {
		cancelAnimationFrame(frame);
		window.removeEventListener('resize', onResize);
		stopTheme();
		disposeScene(scene);
		renderer.dispose();
		renderer.forceContextLoss();
		canvas.classList.remove('ready');
		performance.mark('world:stop');
	};
};
