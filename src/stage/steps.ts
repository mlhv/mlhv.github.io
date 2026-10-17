/** The Stage's Steps, in page order. Section ids, rail links, and camera shots are all keyed by these ids. */
export const STEPS = [
	{ id: 'hello', label: 'Hello' },
	{ id: 'work', label: 'Work Experience' },
	{ id: 'projects', label: 'Projects' },
	{ id: 'blog', label: 'Blog' },
	{ id: 'contact', label: 'Contact' },
] as const;

export type StepId = (typeof STEPS)[number]['id'];

export const isStepId = (value: unknown): value is StepId => STEPS.some((step) => step.id === value);

/** The Step a URL hash points at; anything else (the skip link's #main, typos) is Hello. */
export const stepFromHash = (hash: string): StepId => {
	const id = hash.replace(/^#/, '');
	return isStepId(id) ? id : 'hello';
};

/** Small label at the top of each card: "02 · Work Experience". */
export const kicker = (index: number): string => `${String(index + 1).padStart(2, '0')} · ${STEPS[index].label}`;
