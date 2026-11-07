import { loadNetwork, NetworkError } from './network';
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
});
