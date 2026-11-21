import { londonUnderground } from './london-underground';
import { loadNetwork } from './network';

const lu = loadNetwork(londonUnderground);
const num = (line: string, station: string) =>
  lu.lineByCode[line]!.stops.find((s) => s.stationId === station)?.number;
const label = (code: string) => lu.lineByCode.SSR!.labels.find((l) => l.code === code)!;
const labelsCovering = (station: string) =>
  lu.lineByCode.SSR!.labels.filter((l) => l.stations?.includes(station)).map((l) => l.code);
/** Stations of a stretch of the merged line's main route, from `a` to `b` inclusive. */
const trunkSection = (a: string, b: string) => {
  const ids = londonUnderground.lines.find((l) => l.code === 'SSR')!.trunk;
  return ids.slice(ids.indexOf(a), ids.indexOf(b) + 1);
};

describe('London Underground Zones 1–2 data', () => {
  it('has exactly the 8 included lines', () => {
    expect(lu.lines.map((l) => l.code)).toEqual(['BAK', 'CEN', 'DIS', 'JUB', 'NOR', 'PIC', 'VIC', 'SSR']);
    expect(lu.lines.map((l) => l.name.en)).toEqual([
      'Bakerloo',
      'Central',
      'District',
      'Jubilee',
      'Northern',
      'Piccadilly',
      'Victoria',
      'Circle, Hammersmith & City and Metropolitan',
    ]);
    for (const line of lu.lines) {
      expect(line.name.en, line.code).not.toMatch(/waterloo|overground|elizabeth|dlr|docklands|tram/i);
    }
  });

  it('leaves out stations beyond Zone 2', () => {
    for (const name of ['Wembley Park', 'Wimbledon', 'Heathrow', 'Golders Green', 'Plaistow', 'Southfields']) {
      expect(Object.values(lu.stations).some((s) => s.name.en.startsWith(name)), name).toBe(false);
    }
  });

  it('keeps Zone 2/3 boundary stations', () => {
    for (const id of ['stratford', 'turnham-green', 'east-putney', 'willesden-junction', 'clapham-south', 'west-ham']) {
      expect(lu.stations[id], id).toBeDefined();
    }
  });

  it('does not let excluded lines make interchanges (West Brompton, Waterloo)', () => {
    expect(lu.stations['west-brompton']!.lines).toEqual(['DIS']);
    expect(lu.stations['west-brompton']!.interchange).toBe(false);
    expect(num('DIS', 'west-brompton')).toEqual(expect.any(Number));
    expect(lu.stations.waterloo!.lines).toEqual(['BAK', 'JUB', 'NOR']);
    expect(lu.stations.waterloo!.interchange).toBe(true);
  });

  it('ignores early and late Piccadilly stops at Turnham Green', () => {
    expect(lu.stations['turnham-green']!.lines).toEqual(['DIS']);
    expect(lu.stations['turnham-green']!.interchange).toBe(false);
    expect(num('DIS', 'turnham-green')).toBe(1);
  });

  it('labels the merged line CIR, H&C and MET, each in its own colour', () => {
    const labels = lu.lineByCode.SSR!.labels;
    expect(labels.map((l) => l.code)).toEqual(['CIR', 'H&C', 'MET']);
    expect(new Set(labels.map((l) => l.colour)).size).toBe(3);
    expect(lu.lines.some((l) => ['CIR', 'H&C', 'MET'].includes(l.code))).toBe(false);
  });

  it('numbers stations served only by the merged line (Royal Oak, Great Portland Street, Aldgate)', () => {
    for (const id of ['royal-oak', 'great-portland-street', 'aldgate']) {
      expect(lu.stations[id]!.lines, id).toEqual(['SSR']);
      expect(lu.stations[id]!.interchange, id).toBe(false);
      expect(num('SSR', id), id).toEqual(expect.any(Number));
    }
  });

  it('covers each merged-line section with the right labels', () => {
    // Baker Street–Finchley Road: MET only (Finchley Road is the only stop beyond Baker Street).
    expect(label('MET').stations).toContain('baker-street');
    expect(labelsCovering('finchley-road')).toEqual(['MET']);
    // Hammersmith–Paddington: CIR and H&C.
    const west = trunkSection('hammersmith-hc', 'paddington');
    expect(west).toHaveLength(9);
    for (const id of west) expect(labelsCovering(id), id).toEqual(['CIR', 'H&C']);
    // Aldgate East–Bromley-by-Bow: H&C only.
    const east = trunkSection('aldgate-east', 'bromley-by-bow');
    expect(east).toHaveLength(6);
    for (const id of east) expect(labelsCovering(id), id).toEqual(['H&C']);
    // Aldgate is the MET and CIR station that H&C passes by.
    expect(labelsCovering('aldgate')).toEqual(['CIR', 'MET']);
  });

  it('makes the Circle south loop leave Liverpool Street and rejoin at Paddington', () => {
    const ssr = lu.lineByCode.SSR!;
    const b = ssr.stops.find((s) => s.stationId === 'aldgate')!.branch;
    expect(ssr.branchFrom[b]).toBe('liverpool-street');
    expect(ssr.branchTo[b]).toBe('paddington');
  });

  it('makes the Northern Bank branch a loop rejoining at Kennington', () => {
    const nor = lu.lineByCode.NOR!;
    const b = nor.stops.find((s) => s.stationId === 'angel')!.branch;
    expect(nor.branchTo[b]).toBe('kennington');
  });

  it('links the two Hammersmiths both ways', () => {
    const hc = lu.stations['hammersmith-hc']!;
    const dp = lu.stations['hammersmith-dp']!;
    expect(hc.name.en).toBe('Hammersmith');
    expect(dp.name.en).toBe('Hammersmith');
    expect(hc.interchange).toBe(false);
    expect(num('SSR', 'hammersmith-hc')).toEqual(expect.any(Number));
    expect(hc.transfer).toEqual({ to: 'hammersmith-dp', lines: ['DIS', 'PIC'] });
    expect(dp.interchange).toBe(true);
    expect(dp.transfer).toEqual({ to: 'hammersmith-hc', lines: ['SSR'] });
  });

  it('links Bank and Monument both ways', () => {
    expect(lu.stations.bank!.transfer).toEqual({ to: 'monument', lines: ['DIS', 'SSR'] });
    expect(lu.stations.monument!.transfer).toEqual({ to: 'bank', lines: ['CEN', 'NOR'] });
  });

  it('keeps the two Edgware Roads apart with no transfer', () => {
    const bak = lu.stations['edgware-road-bakerloo']!;
    const circle = lu.stations['edgware-road-circle']!;
    expect([bak.name.en, circle.name.en]).toEqual(['Edgware Road', 'Edgware Road']);
    expect(bak.lines).toEqual(['BAK']);
    expect(circle.lines).toEqual(['DIS', 'SSR']);
    expect(bak.transfer).toBeNull();
    expect(circle.transfer).toBeNull();
  });

  it('has only the four transfers', () => {
    expect(Object.values(lu.stations).filter((s) => s.transfer).map((s) => s.id).sort()).toEqual([
      'bank',
      'hammersmith-dp',
      'hammersmith-hc',
      'monument',
    ]);
  });

  it('has no Chinese names for stations, lines or the network', () => {
    for (const st of Object.values(lu.stations)) {
      expect(st.name.en.trim(), st.id).not.toBe('');
      expect(st.name.zh, st.id).toBeUndefined();
    }
    for (const line of lu.lines) expect(line.name.zh, line.code).toBeUndefined();
    expect(lu.name).toEqual({ en: 'London Underground' });
  });

  it('gives every line a unique code, an English name and a colour', () => {
    expect(new Set(lu.lines.map((l) => l.code)).size).toBe(lu.lines.length);
    for (const line of lu.lines) {
      expect(line.name.en.trim()).not.toBe('');
      expect(line.colour).toMatch(/^#[0-9A-Fa-f]{6}$/);
      for (const l of line.labels) expect(l.colour).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('names its wild cards Oyster and Tube Strike', () => {
    expect(lu.wilds.wild.name.en).toBe('Oyster');
    expect(lu.wilds.draw4.name.en).toBe('Tube Strike');
    expect(lu.wilds.wild.art).toBe('oyster');
    expect(lu.wilds.draw4.art).toBe('ring');
  });

  it('never repeats a number on a line', () => {
    for (const line of lu.lines) {
      const nums = line.stops.map((s) => s.number).filter((n) => n !== null);
      expect(new Set(nums).size, line.code).toBe(nums.length);
    }
  });

  it('has 136 stations, 50 of them interchanges', () => {
    expect(Object.keys(lu.stations)).toHaveLength(136);
    expect(Object.values(lu.stations).filter((s) => s.interchange)).toHaveLength(50);
  });

  it('matches the expected stop and numbered-station counts per line', () => {
    const counts = Object.fromEntries(
      lu.lines.map((l) => [l.code, [l.stops.length, l.stops.filter((s) => s.number !== null).length]]),
    );
    expect(counts).toEqual({
      BAK: [18, 10],
      CEN: [20, 11],
      DIS: [38, 10],
      JUB: [20, 11],
      NOR: [32, 19],
      PIC: [19, 8],
      VIC: [12, 4],
      SSR: [43, 13],
    });
  });
});
