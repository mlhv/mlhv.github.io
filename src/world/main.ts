import {
	CircleGeometry,
	Color,
	DirectionalLight,
	Fog,
	Group,
	HemisphereLight,
	Mesh,
	MeshBasicMaterial,
	PerspectiveCamera,
	Points,
	Scene,
	SkinnedMesh,
	Texture,
	WebGLRenderer,
	type Material,
	type Object3D,
} from 'three';
import type { StepId } from '../stage/steps';
import { glideAt, retarget, shotFor, still, type CameraKey, type Glide } from './camera-path';
import type { CastMember } from './cast';
import { cast } from './characters';
import { motionPose } from './motion';
import { createSpeech, hopHeight } from './speech';
import { createStandIn, createStandInMaterial } from './stand-in';
import { surfaceY } from './terrain';
import { PRESETS, documentTheme, watchTheme, type WorldTheme } from './theme';
import { buildTown } from './town';

export interface WorldOptions {
	reducedMotion: boolean;
	/** The Step to frame first (from the Stage, or the URL hash before the Stage has spoken). */
	initialStep: StepId;
}

export interface WorldController {
	/** Frees every GPU resource and listener. */
	stop: () => void;
	/** Glides the camera to a Step's Host (cuts instantly with reduced motion). */
	goTo: (step: StepId) => void;
}

interface Actor {
	member: CastMember;
	/** Moved every frame; holds the Stand-in or the model. Speech raycasts target it. */
	slot: Group;
	/** The Stand-in while the slot shows one. */
	standIn: Mesh | null;
	shadow: Mesh;
	seed: number;
	/** Seconds since start when the last hop began. */
	hopStart: number;
}

/** Frees the geometries, materials, textures and skeletons under `root`. */
const disposeObject = (root: Object3D) =>
	root.traverse((node) => {
		if (node instanceof SkinnedMesh) node.skeleton.dispose();
		if (node instanceof Mesh || node instanceof Points) {
			node.geometry.dispose();
			const materials: Material[] = Array.isArray(node.material) ? node.material : [node.material];
			for (const material of materials) {
				for (const value of Object.values(material)) if (value instanceof Texture) value.dispose();
				material.dispose();
			}
		}
	});

/** Builds the World into `canvas` and starts it on `options.initialStep`. */
export const startWorld = async (
	canvas: HTMLCanvasElement,
	bubble: HTMLElement,
	options: WorldOptions,
): Promise<WorldController> => {
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
	const standInMaterial = createStandInMaterial();
	const actors: Actor[] = cast.map((member, index) => {
		const slot = new Group();
		const standIn = createStandIn(member.height, standInMaterial);
		slot.add(standIn);
		const shadow = new Mesh(shadowGeometry, shadowMaterial);
		shadow.rotation.x = -Math.PI / 2;
		// Capped so Reshiram's shadow doesn't spread past the edge of the cliff.
		shadow.scale.setScalar(Math.min(10, member.height * 0.3));
		scene.add(slot, shadow);
		return { member, slot, standIn, shadow, seed: index * 1.7, hopStart: -Infinity };
	});

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
		standInMaterial.color.set(preset.standIn);
		standInMaterial.emissive.set(preset.standIn);
		standInMaterial.emissiveIntensity = preset.standInGlow;
	};

	const resize = () => {
		const { innerWidth: w, innerHeight: h } = window;
		renderer.setSize(w, h, false);
		camera.aspect = w / h;
		camera.fov = w < h ? 55 : 40;
		camera.updateProjectionMatrix();
	};

	const start = performance.now();
	const seconds = () => (performance.now() - start) / 1000;

	let step = options.initialStep;
	let glide: Glide = still(shotFor(step, 1)); // re-aimed for the real aspect right after the first resize()
	const aimCamera = (t: number) => {
		const { position, target } = glideAt(glide, t);
		camera.position.set(...position);
		camera.lookAt(...target);
	};

	const place = (actor: Actor, t: number) => {
		const [x, z] = actor.member.position;
		const pose = motionPose(actor.member.motion, options.reducedMotion ? 0 : t, options.reducedMotion ? 0 : actor.seed);
		const ground = surfaceY(x, z);
		const hop = options.reducedMotion ? 0 : hopHeight(t - actor.hopStart);
		actor.slot.position.set(x, ground + pose.dy + hop, z);
		actor.slot.rotation.set(0, actor.member.facing, pose.sway);
		actor.shadow.position.set(x, ground + 0.05, z);
	};

	const speech = createSpeech({
		camera,
		bubble,
		targets: actors.map(({ member, slot }) => ({ member, object: slot })),
		onPick: (id) => {
			const actor = actors.find((a) => a.member.id === id);
			if (actor) actor.hopStart = seconds();
			if (options.reducedMotion) render();
		},
	});
	const render = () => {
		renderer.render(scene, camera);
		speech.update();
	};

	/** Points the camera at `shot`: a cut with reduced motion, otherwise a glide from where it is now. */
	const moveTo = (shot: CameraKey) => {
		if (options.reducedMotion) {
			glide = still(shot);
			aimCamera(0);
			render();
		} else {
			glide = retarget(glide, shot, seconds());
		}
	};

	let frame = 0;
	const tick = (now: number) => {
		frame = requestAnimationFrame(tick);
		if (document.hidden) return;
		const t = (now - start) / 1000;
		aimCamera(t);
		for (const actor of actors) place(actor, t);
		render();
	};

	resize();
	applyTheme(documentTheme());
	glide = still(shotFor(step, camera.aspect));
	aimCamera(0);
	for (const actor of actors) place(actor, 0);

	const stopTheme = watchTheme((theme) => {
		applyTheme(theme);
		if (options.reducedMotion) render();
	});
	const onResize = () => {
		resize();
		const shot = shotFor(step, camera.aspect);
		if (shot !== glide.to) moveTo(shot);
		else if (options.reducedMotion) render();
	};
	window.addEventListener('resize', onResize);

	if (options.reducedMotion) render();
	else frame = requestAnimationFrame(tick);
	canvas.classList.add('ready');
	performance.mark('world:start');

	return {
		stop: () => {
			cancelAnimationFrame(frame);
			window.removeEventListener('resize', onResize);
			stopTheme();
			speech.dispose();
			disposeObject(scene);
			standInMaterial.dispose(); // not in the scene once every Stand-in has been swapped out
			renderer.dispose();
			renderer.forceContextLoss();
			canvas.classList.remove('ready');
			performance.mark('world:stop');
		},
		goTo: (next) => {
			if (next === step) return;
			step = next;
			moveTo(shotFor(step, camera.aspect));
		},
	};
};
