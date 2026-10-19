import {
	AnimationMixer,
	CircleGeometry,
	Color,
	DirectionalLight,
	Fog,
	Group,
	HemisphereLight,
	LoopOnce,
	Mesh,
	MeshBasicMaterial,
	PerspectiveCamera,
	Points,
	Scene,
	SkinnedMesh,
	Texture,
	WebGLRenderer,
	type AnimationAction,
	type Material,
	type Object3D,
} from 'three';
import type { StepId } from '../stage/steps';
import { glideAt, retarget, shotFor, still, type CameraKey, type Glide } from './camera-path';
import type { CastMember } from './cast';
import { hosts } from './characters';
import { loadCharacter, type LoadedCharacter } from './load-character';
import { loadOrder } from './load-order';
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

interface Rig {
	mixer: AnimationMixer;
	idle: AnimationAction;
	talk: AnimationAction | null;
}

interface Actor {
	member: CastMember;
	/** Moved every frame; holds the Stand-in or the model. Speech raycasts target it. */
	slot: Group;
	/** The Stand-in while the slot shows one. */
	standIn: Mesh | null;
	/** The loaded model's animation, once it has swapped in. */
	rig: Rig | null;
	shadow: Mesh;
	seed: number;
	/** Seconds since start when the last hop began. */
	hopStart: number;
}

/** Seconds a clip takes to blend into the next. */
const BLEND_SECONDS = 0.25;
/** Caps one frame's animation step, so a tab that was hidden for a while doesn't jump. */
const MAX_FRAME_SECONDS = 0.1;

/** Cross-fades `from` into `to`. Re-enables `to` first: three.js disables an action once it has faded out to 0. */
const fadeTo = (from: AnimationAction, to: AnimationAction) => {
	to.enabled = true;
	to.setEffectiveTimeScale(1);
	to.setEffectiveWeight(1);
	to.play();
	from.crossFadeTo(to, BLEND_SECONDS, false);
};

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
	const actors: Actor[] = hosts.map((member, index) => {
		const slot = new Group();
		const standIn = createStandIn(member.height, standInMaterial);
		slot.add(standIn);
		const shadow = new Mesh(shadowGeometry, shadowMaterial);
		shadow.rotation.x = -Math.PI / 2;
		// Capped so Reshiram's shadow doesn't spread past the edge of the cliff.
		shadow.scale.setScalar(Math.min(10, member.height * 0.3));
		scene.add(slot, shadow);
		return { member, slot, standIn, rig: null, shadow, seed: index * 1.7, hopStart: -Infinity };
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
			if (actor && !options.reducedMotion) {
				const talk = actor.rig?.talk;
				// A running talk has already faded idle out; fading it in again from weight 0 would show the bind pose.
				if (actor.rig && talk) {
					if (talk.isRunning()) talk.reset();
					else fadeTo(actor.rig.idle, talk.reset());
				} else actor.hopStart = seconds();
			}
			if (options.reducedMotion) render();
		},
	});
	const render = () => {
		renderer.render(scene, camera);
		speech.update();
	};

	/** Replaces an actor's Stand-in with its loaded model and starts the idle clip. */
	const swapIn = (actor: Actor, { object, clips }: LoadedCharacter) => {
		if (actor.standIn) {
			actor.slot.remove(actor.standIn);
			actor.standIn.geometry.dispose(); // the material is shared with the other Stand-ins
			actor.standIn = null;
		}
		actor.slot.add(object);
		const mixer = new AnimationMixer(object);
		const idle = mixer.clipAction(clips.idle).play();
		// Offset per Host so they don't breathe in step; reduced motion holds frame 0 as the standing pose.
		idle.time = options.reducedMotion || clips.idle.duration <= 0 ? 0 : (actor.seed * 0.37) % clips.idle.duration;
		const talk = clips.talk ? mixer.clipAction(clips.talk) : null;
		if (talk) {
			talk.setLoop(LoopOnce, 1);
			talk.clampWhenFinished = true;
			mixer.addEventListener('finished', (event) => {
				if (event.action === talk) fadeTo(talk, idle);
			});
		}
		mixer.update(0);
		actor.rig = { mixer, idle, talk };
		if (options.reducedMotion) render();
	};

	let stopped = false;
	/** Loads models one at a time; a failure keeps that Stand-in and moves on. */
	const loadModels = async () => {
		for (const member of loadOrder(hosts, options.initialStep)) {
			const actor = actors.find((a) => a.member === member);
			if (!actor) continue;
			try {
				const loaded = await loadCharacter(member.source, member.height);
				if (stopped) {
					disposeObject(loaded.object);
					return;
				}
				swapIn(actor, loaded);
			} catch (error) {
				if (stopped) return;
				console.warn('[world] model failed', member.id, error);
			}
		}
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
	let last = start;
	const tick = (now: number) => {
		frame = requestAnimationFrame(tick);
		if (document.hidden) return;
		const t = (now - start) / 1000;
		const delta = Math.min(MAX_FRAME_SECONDS, Math.max(0, (now - last) / 1000));
		last = now;
		aimCamera(t);
		for (const actor of actors) {
			place(actor, t);
			actor.rig?.mixer.update(delta);
		}
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
	void loadModels();

	return {
		stop: () => {
			stopped = true;
			for (const actor of actors) actor.rig?.mixer.stopAllAction();
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
