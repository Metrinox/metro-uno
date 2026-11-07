import type { NetworkDef } from './network';

const n = (en: string) => ({ en, zh: en + '站' });

/** Test network: two lines sharing station X; line B has a branch. */
export const tinyDef: NetworkDef = {
  id: 'tiny',
  name: n('Tiny'),
  stations: { a1: n('A1'), a2: n('A2'), x: n('X'), b1: n('B1'), b2: n('B2'), b3: n('B3') },
  lines: [
    { code: 'A', name: n('Line A'), colour: '#ff0000', trunk: ['a1', 'x', 'a2'] },
    {
      code: 'B',
      name: n('Line B'),
      colour: '#0000ff',
      trunk: ['x', 'b1', 'b2'],
      branches: [{ from: 'b1', stations: ['b3'] }],
    },
  ],
};
