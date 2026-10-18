import { STEPS, type StepId } from '../stage/steps';
import { FRAMINGS } from './camera-path';
import type { CastMember, CharacterSource } from './cast';

export type ModelledMember = CastMember & { source: CharacterSource };

/**
 * Cast Members with a model, in the order to load them: the first Step's Host, then the other Hosts in Step order,
 * then everyone else in cast order. One at a time, so the next Host is usually ready before it is scrolled to.
 */
export const loadOrder = (members: readonly CastMember[], first: StepId): ModelledMember[] => {
	const hostIds = [FRAMINGS[first].castId, ...STEPS.map((s) => FRAMINGS[s.id].castId)];
	const rank = (m: CastMember) => {
		const index = hostIds.indexOf(m.id);
		return index === -1 ? hostIds.length : index;
	};
	return members
		.filter((m): m is ModelledMember => m.source !== null)
		.map((m, index) => ({ m, index }))
		.sort((a, b) => rank(a.m) - rank(b.m) || a.index - b.index)
		.map(({ m }) => m);
};
