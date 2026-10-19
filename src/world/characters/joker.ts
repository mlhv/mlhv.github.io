import type { CastMember } from '../cast';

export const joker: CastMember = {
	id: 'joker',
	name: 'Joker',
	position: [-13, -34],
	facing: 0.3,
	height: 17,
	motion: { kind: 'still' },
	source: null,
	credit: null,
	lines: ['…', "Leblanc's coffee is the best in town.", 'Take your time.'],
};
