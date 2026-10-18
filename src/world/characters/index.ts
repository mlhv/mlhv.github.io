import type { CastMember } from '../cast';
import { isabelle } from './isabelle';
import { joker } from './joker';
import { minh } from './minh';
import { phoenix } from './phoenix';
import { reshiram } from './reshiram';

/** The Hosts in Step order. Extras, if they return, go after them. */
export const cast: CastMember[] = [minh, phoenix, joker, isabelle, reshiram];
