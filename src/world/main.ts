import {
	AnimationMixer,
	CircleGeometry,
	Group,
	LoopOnce,
	Mesh,
	MeshBasicMaterial,
	InstancedMesh,
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
import type { CastMember } from './cast';
import { hosts } from './characters';
import { loadCharacter, type LoadedCharacter } from './load-character';
import { BASE_FOV, CAMERA, heightAt, verticalFov } from './meadow/layout';
import { buildMeadow } from './meadow/meadow';
import { TIERS, drawDue, newMonitor, nextTier, pickTier, recordFrame, tierOverride, type Tier } from './meadow/quality';
import { motionPose } from './motion';
import { createSpeech, hopHeight } from './speech';
import { STAND_IN, createStandIn, createStandInMaterial } from './stand-in';
import { PRESETS, documentTheme, watchTheme, type WorldTheme } from './theme';

export interface WorldOptions {
	reducedMotion: boolean;
}

export interface WorldController {
	/** Frees every GPU resource and listener. */
	stop: () => void;
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
		if (node instanceof InstancedMesh) node.dispose(); // frees the instance-matrix buffer
		if (node instanceof Mesh || node instanceof Points) {
			node.geometry.dispose();
			const materials: Material[] = Array.isArray(node.material) ? node.material : [node.material];
			for (const material of materials) {
				for (const value of Object.values(material)) if (value instanceof Texture) value.dispose();
				material.dispose();
			}
		}
	});

/** What pickTier reads from the browser. deviceMemory is Chromium-only. */
const deviceHints = () => ({
	coarsePointer: window.matchMedia('(pointer: coarse)').matches,
	cores: navigator.hardwareConcurrency || undefined,
	memoryGB: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
});

/** Builds the World into `canvas`: the meadow, seen from one fixed camera. */
export const startWorld = async (
	canvas: HTMLCanvasElement,
	bubble: HTMLElement,
	options: WorldOptions,
): Promise<WorldController> => {
	// `?world=low|medium|high` pins a tier while developing; the frame check then only logs.
	const forced = import.meta.env.DEV ? tierOverride(location.search) : null;
	let tier: Tier = forced ?? pickTier(deviceHints());

	const renderer = new WebGLRenderer({ canvas, antialias: true });
	const applyPixelRatio = () => renderer.setPixelRatio(Math.min(window.devicePixelRatio, TIERS[tier].pixelRatio));
	applyPixelRatio();

	const scene = new Scene();
	const meadow = buildMeadow(tier);
	scene.fog = meadow.fog;
	scene.add(meadow.group);
	const camera = new PerspectiveCamera(BASE_FOV, 1, 1, 1000);
	camera.position.set(...CAMERA.position);
	camera.lookAt(...CAMERA.target);

	const shadowGeometry = new CircleGeometry(1, 20);
	const shadowMaterial = new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false });
	const standInMaterial = createStandInMaterial();
	const actors: Actor[] = hosts.map((member, index) => {
		const slot = new Group();
		const standIn = createStandIn(member.height, standInMaterial);
		slot.add(standIn);
		const shadow = new Mesh(shadowGeometry, shadowMaterial);
		shadow.rotation.x = -Math.PI / 2;
		shadow.scale.setScalar(Math.min(10, member.height * 0.3));
		scene.add(slot, shadow);
		return { member, slot, standIn, rig: null, shadow, seed: index * 1.7, hopStart: -Infinity };
	});

	const applyTheme = (theme: WorldTheme) => {
		meadow.applyTheme(PRESETS[theme]);
		standInMaterial.color.set(STAND_IN.color);
		standInMaterial.emissive.set(STAND_IN.color);
		standInMaterial.emissiveIntensity = STAND_IN.glow[theme];
	};

	const resize = () => {
		const { innerWidth: w, innerHeight: h } = window;
		renderer.setSize(w, h, false);
		camera.aspect = w / h;
		camera.fov = verticalFov(camera.aspect);
		camera.updateProjectionMatrix();
	};

	const start = performance.now();
	const seconds = () => (performance.now() - start) / 1000;

	const place = (actor: Actor, t: number) => {
		const [x, z] = actor.member.position;
		const pose = motionPose(actor.member.motion, options.reducedMotion ? 0 : t, options.reducedMotion ? 0 : actor.seed);
		const ground = heightAt(x, z);
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
	/** Loads models one at a time, in cast order; a failure keeps that Stand-in and moves on. */
	const loadModels = async () => {
		for (const actor of actors) {
			const { source } = actor.member;
			if (!source) continue;
			try {
				const loaded = await loadCharacter(source, actor.member.height);
				if (stopped) {
					disposeObject(loaded.object);
					return;
				}
				swapIn(actor, loaded);
			} catch (error) {
				if (stopped) return;
				console.warn('[world] model failed', actor.member.id, error);
			}
		}
	};

	const setTier = (next: Tier) => {
		tier = next;
		meadow.setTier(next);
		applyPixelRatio();
		resize();
	};

	let frame = 0;
	let lastDrawn = start; // the throttle's frame slot; may trail the last draw while leftover time carries
	let lastDrawnAt = start; // when the last draw happened, for the animation delta
	let lastCallback: number | null = null;
	let monitor = newMonitor();
	let measuring = true;
	const tick = (now: number) => {
		frame = requestAnimationFrame(tick);
		if (document.hidden) {
			monitor = newMonitor(); // a hidden tab's gap is a pause, not a slow frame
			lastCallback = null;
			return;
		}
		// Measure the per-rAF interval, not the throttled draw gap: a healthy 75/90 Hz display would otherwise look slow.
		const interval = lastCallback === null ? null : now - lastCallback;
		lastCallback = now;
		const t = (now - start) / 1000;
		if (measuring && interval !== null) {
			const result = recordFrame(monitor, interval, t);
			monitor = result.monitor;
			if (result.average !== null) {
				if (import.meta.env.DEV) console.info(`[world] tier=${tier} avg=${result.average.toFixed(1)}ms`);
				const next = forced ?? nextTier(tier, result.average);
				if (next !== tier) {
					setTier(next);
					monitor = newMonitor();
				} else measuring = false;
			}
		}
		const advance = drawDue(now - lastDrawn, TIERS[tier].fps); // only the 30 fps tier is throttled
		if (advance === null) return;
		lastDrawn += advance;
		const gap = now - lastDrawnAt;
		lastDrawnAt = now;
		meadow.update(t);
		const delta = Math.min(MAX_FRAME_SECONDS, Math.max(0, gap / 1000));
		for (const actor of actors) {
			place(actor, t);
			actor.rig?.mixer.update(delta);
		}
		render();
	};

	resize();
	applyTheme(documentTheme());
	meadow.update(0);
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
	};
};
