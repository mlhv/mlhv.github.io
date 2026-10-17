import { Box3, Raycaster, Vector2, Vector3, type Camera, type Object3D } from 'three';
import type { CastMember } from './cast';

export const HOP_SECONDS = 0.45;
export const HOP_HEIGHT = 3;

/** Height of a click-hop `elapsed` seconds after it began; 0 outside the hop. */
export const hopHeight = (elapsed: number): number =>
	Number.isFinite(elapsed) && elapsed > 0 && elapsed < HOP_SECONDS
		? Math.sin((Math.PI * elapsed) / HOP_SECONDS) * HOP_HEIGHT
		: 0;

/** A random line, never the previous one when there is a choice. */
export const pickLine = (lines: readonly string[], previous: string | null, random: () => number = Math.random): string => {
	const choices = lines.length > 1 ? lines.filter((line) => line !== previous) : lines;
	return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
};

export interface SpeechTarget {
	member: CastMember;
	object: Object3D;
}

export interface Speech {
	/** Re-positions an open bubble over its speaker; call after each render. */
	update(): void;
	dispose(): void;
}

/** Clicks on these never reach the World: content always wins. */
const SOLID = 'a, button, input, select, textarea, label, header, [data-world-solid]';

export const createSpeech = ({
	camera,
	bubble,
	targets,
	onPick,
}: {
	camera: Camera;
	bubble: HTMLElement;
	targets: readonly SpeechTarget[];
	onPick: (id: string) => void;
}): Speech => {
	const raycaster = new Raycaster();
	const pointer = new Vector2();
	const head = new Vector3();
	const bounds = new Box3();
	const said = new Map<string, string>();
	let speaker: SpeechTarget | null = null;

	const update = () => {
		if (!speaker) return;
		bounds.setFromObject(speaker.object);
		bounds.getCenter(head);
		head.y = bounds.max.y;
		head.project(camera);
		if (head.z > 1) {
			bubble.style.visibility = 'hidden';
			return;
		}
		bubble.style.visibility = '';
		// Clamped so a speaker near the edge of a phone screen keeps its whole bubble on screen.
		const half = bubble.offsetWidth / 2;
		const x = Math.min(window.innerWidth - 8 - half, Math.max(8 + half, ((head.x + 1) / 2) * window.innerWidth));
		const y = ((1 - head.y) / 2) * window.innerHeight;
		bubble.style.transform = `translate(${x}px, ${y}px) translate(-50%, calc(-100% - 12px))`;
	};

	const close = () => {
		speaker = null;
		bubble.hidden = true;
	};

	const open = (target: SpeechTarget) => {
		const line = pickLine(target.member.lines, said.get(target.member.id) ?? null);
		said.set(target.member.id, line);
		const name = document.createElement('strong');
		name.textContent = target.member.name;
		bubble.replaceChildren(name, document.createTextNode(` ${line}`));
		bubble.hidden = false;
		speaker = target;
		onPick(target.member.id);
		update();
	};

	const speakerOf = (hit: Object3D) => {
		for (let node: Object3D | null = hit; node; node = node.parent) {
			const target = targets.find((t) => t.object === node);
			if (target) return target;
		}
		return null;
	};

	// `click`, not `pointerdown`: a finger drag that starts on a character must scroll, not talk.
	const onClick = (event: MouseEvent) => {
		if (event.target instanceof Element && event.target.closest(SOLID)) return;
		pointer.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
		raycaster.setFromCamera(pointer, camera);
		const [hit] = raycaster.intersectObjects(
			targets.map((t) => t.object),
			true,
		);
		const target = hit ? speakerOf(hit.object) : null;
		if (target) open(target);
		else close();
	};

	const onKeyDown = (event: KeyboardEvent) => {
		if (event.key === 'Escape') close();
	};

	document.addEventListener('click', onClick);
	document.addEventListener('keydown', onKeyDown);
	return {
		update,
		dispose: () => {
			document.removeEventListener('click', onClick);
			document.removeEventListener('keydown', onKeyDown);
			close();
		},
	};
};
