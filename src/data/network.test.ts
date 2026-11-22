import { loadNetwork, NetworkError, type NetworkDef } from './network';
import { tinyDef } from './tiny-network';

const n = (en: string) => ({ en, zh: en + '站' });

describe('loadNetwork', () => {
  const net = loadNetwork(tinyDef);

  it('derives interchanges from line membership', () => {
    expect(net.stations.x!.interchange).toBe(true);
    expect(net.stations.x!.lines).toEqual(['A', 'B']);
    expect(net.stations.a1!.interchange).toBe(false);
  });

  it('numbers stations, skipping interchanges', () => {
    const a = net.lineByCode.A!.stops.map((s) => [s.stationId, s.number]);
    expect(a).toEqual([
      ['a1', 1],
      ['x', null],
      ['a2', 2],
    ]);
    expect(net.stations.x!.numbers).toEqual({ A: null, B: null });
  });

  it('numbers branches after the trunk without repeats', () => {
    const b = net.lineByCode.B!.stops.map((s) => [s.stationId, s.number, s.branch]);
    expect(b).toEqual([
      ['x', null, 0],
      ['b1', 1, 0],
      ['b2', 2, 0],
      ['b3', 3, 1],
    ]);
    expect(net.lineByCode.B!.branchFrom).toEqual([null, 'b1']);
  });

  it('defaults a line\'s labels to its own code and colour', () => {
    expect(net.lineByCode.A!.labels).toEqual([{ code: 'A', colour: '#ff0000' }]);
  });

  it('gives a transfer station the other station\'s lines', () => {
    const withTransfer = loadNetwork({ ...tinyDef, transfers: [{ from: 'a2', to: 'b2' }] });
    expect(withTransfer.stations.a2!.transfer).toEqual({ to: 'b2', lines: ['B'] });
    expect(withTransfer.stations.a2!.interchange).toBe(false);
    expect(withTransfer.stations.b2!.transfer).toBeNull();
  });

  it('lets an interchange have a transfer, keeping it an interchange', () => {
    const withC = {
      ...tinyDef,
      stations: { ...tinyDef.stations, c1: n('C1') },
      lines: [...tinyDef.lines, { code: 'C', name: n('Line C'), colour: '#00ff00', trunk: ['c1'] }],
      transfers: [{ from: 'x', to: 'c1' }],
    };
    const net2 = loadNetwork(withC);
    expect(net2.stations.x!.interchange).toBe(true);
    expect(net2.stations.x!.transfer).toEqual({ to: 'c1', lines: ['C'] });
    // x already serves A, so a transfer to a1 (line A only) adds nothing.
    expect(() => loadNetwork({ ...tinyDef, transfers: [{ from: 'x', to: 'a1' }] })).toThrow(/no other line/);
  });

  it('rejects invalid transfers', () => {
    expect(() => loadNetwork({ ...tinyDef, transfers: [{ from: 'a1', to: 'nope' }] })).toThrow(/unknown station/);
    expect(() => loadNetwork({ ...tinyDef, transfers: [{ from: 'a1', to: 'a2' }] })).toThrow(/no other line/);
  });

  it('rejects an unknown station, naming the line and station', () => {
    const bad = { ...tinyDef, lines: [{ ...tinyDef.lines[0]!, trunk: ['a1', 'nope'] }] };
    expect(() => loadNetwork(bad)).toThrow(NetworkError);
    expect(() => loadNetwork(bad)).toThrow(/A.*"nope"/);
  });

  it('rejects a line with no stations', () => {
    const bad = { ...tinyDef, lines: [...tinyDef.lines, { code: 'C', name: n('C'), colour: '#000', trunk: [] }] };
    expect(() => loadNetwork(bad)).toThrow(/C has no stations/);
  });

  it('rejects duplicate line codes', () => {
    const bad = { ...tinyDef, lines: [tinyDef.lines[0]!, { ...tinyDef.lines[1]!, code: 'A' }] };
    expect(() => loadNetwork(bad)).toThrow(/Duplicate line code "A"/);
  });

  it('supports a branch that rejoins the line, and validates the rejoin station', () => {
    const loop = (to: string) => ({
      ...tinyDef,
      lines: [tinyDef.lines[0]!, { ...tinyDef.lines[1]!, branches: [{ from: 'x', to, stations: ['b3'] }] }],
    });
    expect(loadNetwork(loop('b2')).lineByCode.B!.branchTo).toEqual([null, 'b2']);
    expect(() => loadNetwork(loop('a1'))).toThrow(/rejoining at "a1"/);
    expect(() => loadNetwork(loop('x'))).toThrow(/rejoins where it starts/);
  });

  it('rejects a branch from a station not on the line', () => {
    const bad = {
      ...tinyDef,
      lines: [tinyDef.lines[0]!, { ...tinyDef.lines[1]!, branches: [{ from: 'a1', stations: ['b3'] }] }],
    };
    expect(() => loadNetwork(bad)).toThrow(/branch from "a1"/);
  });

  it('gives every station a card number, and none to an ordinary interchange', () => {
    expect(net.stations.a1!.number).toBe(1);
    expect(net.stations.b3!.number).toBe(net.stations.b3!.numbers.B);
    expect(net.stations.x!.number).toBeNull();
  });

  describe('shared-track lines', () => {
    // S1 and S2 share track: p (S1), q (S1+S2), r (S1+S2+Z), s and t (S2, t on a branch).
    const sharedDef: NetworkDef = {
      id: 'shared',
      name: n('Shared'),
      wilds: tinyDef.wilds,
      stations: { p: n('P'), q: n('Q'), r: n('R'), s: n('S'), t: n('T'), z: n('Z') },
      lines: [
        { code: 'S1', name: n('Line S1'), colour: '#111111', trunk: ['p', 'q', 'r'] },
        { code: 'S2', name: n('Line S2'), colour: '#222222', trunk: ['q', 'r', 's'], branches: [{ from: 's', stations: ['t'] }] },
        { code: 'Z', name: n('Line Z'), colour: '#333333', trunk: ['r', 'z'] },
      ],
      sharedTrack: {
        lines: ['S1', 'S2'],
        groups: [
          { id: 'g1', trunk: ['p', 'q', 'r'] },
          { id: 'g2', trunk: ['s'], branches: [{ from: 's', stations: ['t'] }] },
        ],
      },
    };
    const shared = loadNetwork(sharedDef);
    const withShared = (sharedTrack: Partial<NetworkDef['sharedTrack']>) =>
      loadNetwork({ ...sharedDef, sharedTrack: { ...sharedDef.sharedTrack!, ...sharedTrack } });

    it('makes a station on shared-track lines only a plain station on all of them', () => {
      const q = shared.stations.q!;
      expect(q.interchange).toBe(false);
      expect(q.lines).toEqual(['S1', 'S2']);
      expect(q.number).toBe(2);
      expect(q.numbers).toEqual({ S1: 2, S2: 2 });
    });

    it('keeps a shared-track station on another line an unnumbered interchange', () => {
      expect(shared.stations.r!.interchange).toBe(true);
      expect(shared.stations.r!.number).toBeNull();
    });

    it('numbers each group on its own, skipping interchanges and running on through branches', () => {
      expect(['p', 'q', 'r', 's', 't'].map((id) => shared.stations[id]!.number)).toEqual([1, 2, null, 1, 2]);
      expect(shared.stations.s!.group).toBe('g2');
      expect(shared.stations.z!.group).toBeNull();
      expect(shared.groups).toEqual([
        { id: 'g1', stationIds: ['p', 'q', 'r'] },
        { id: 'g2', stationIds: ['s', 't'] },
      ]);
      // Line strips show the group numbers.
      expect(shared.lineByCode.S2!.stops.map((s) => s.number)).toEqual([2, null, 1, 2]);
    });

    it('rejects bad shared-track lines', () => {
      expect(() => withShared({ lines: ['S1', 'Q9'] })).toThrow(/Shared-track line "Q9"/);
      expect(() => withShared({ lines: ['S1'] })).toThrow(/at least two different lines/);
    });

    it('rejects a station in no group or two, and a group station off the shared lines', () => {
      expect(() => withShared({ groups: [{ id: 'g1', trunk: ['p', 'q', 'r'] }] })).toThrow(/Station "s" is on a shared-track line but in no group/);
      expect(() => withShared({ groups: [...sharedDef.sharedTrack!.groups, { id: 'g3', trunk: ['q'] }] })).toThrow(
        /"q" is in groups g1 and g3/,
      );
      expect(() => withShared({ groups: [...sharedDef.sharedTrack!.groups, { id: 'g3', trunk: ['z'] }] })).toThrow(
        /Group g3 lists "z", which no shared-track line serves/,
      );
    });
  });
});
