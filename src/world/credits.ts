import type { Credit } from './cast';

/** The model credits to show, in cast order. Members without a model have no credit and are skipped. */
export const creditLines = (members: readonly { credit: Credit | null }[]): Credit[] =>
	members.flatMap((member) => (member.credit ? [member.credit] : []));
