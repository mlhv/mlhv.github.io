import type { CastMember } from '../cast';
import { isabelle } from './isabelle';
import { joker } from './joker';
import { minh } from './minh';
import { phoenix } from './phoenix';
import { reshiram } from './reshiram';

/** The Hosts in Step order. Extras, if they return, go after them. */
export const cast: CastMember[] = [minh, phoenix, joker, isabelle, reshiram];

/** Off until the characters are ready (after co-op applications, 2026-10-23); set true to bring the Hosts back. */
export const showHosts = false;

/** The Cast Members the World puts on stage. */
export const hosts: CastMember[] = showHosts ? cast : [];
