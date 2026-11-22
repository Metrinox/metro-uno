import { londonUnderground } from './london-underground';
import { loadNetwork } from './network';

const lu = loadNetwork(londonUnderground);
const num = (line: string, station: string) =>
  lu.lineByCode[line]!.stops.find((s) => s.stationId === station)?.number;
const SUBSURFACE = ['CIR', 'H&C', 'MET', 'DIS'];

describe('London Underground Zones 1–2 data', () => {
  it('has exactly the 10 included lines', () => {
    expect(lu.lines.map((l) => l.code)).toEqual(['BAK', 'CEN', 'CIR', 'DIS', 'H&C', 'JUB', 'MET', 'NOR', 'PIC', 'VIC']);
    expect(lu.lines.map((l) => l.name.en)).toEqual([
      'Bakerloo',
      'Central',
      'Circle',
      'District',
      'Hammersmith & City',
      'Jubilee',
      'Metropolitan',
      'Northern',
      'Piccadilly',
      'Victoria',
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

  it('makes the Circle south loop leave Liverpool Street and rejoin at Paddington', () => {
    const cir = lu.lineByCode.CIR!;
    const b = cir.stops.find((s) => s.stationId === 'aldgate')!.branch;
    expect(cir.branchFrom[b]).toBe('liverpool-street');
    expect(cir.branchTo[b]).toBe('paddington');
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
    expect(hc.lines).toEqual(['CIR', 'H&C']);
    expect(hc.number).toBe(1);
    expect(hc.transfer).toEqual({ to: 'hammersmith-dp', lines: ['DIS', 'PIC'] });
    expect(dp.interchange).toBe(true);
    expect(dp.transfer).toEqual({ to: 'hammersmith-hc', lines: ['CIR', 'H&C'] });
  });

  it('links Bank and Monument both ways', () => {
    expect(lu.stations.bank!.transfer).toEqual({ to: 'monument', lines: ['CIR', 'DIS'] });
    expect(lu.stations.monument!.transfer).toEqual({ to: 'bank', lines: ['CEN', 'NOR'] });
  });

  it('keeps the two Edgware Roads apart with no transfer', () => {
    const bak = lu.stations['edgware-road-bakerloo']!;
    const circle = lu.stations['edgware-road-circle']!;
    expect([bak.name.en, circle.name.en]).toEqual(['Edgware Road', 'Edgware Road']);
    expect(bak.lines).toEqual(['BAK']);
    expect(circle.lines).toEqual(['CIR', 'DIS', 'H&C']);
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

  it('never repeats a number on a line, except across subsurface groups', () => {
    for (const line of lu.lines) {
      const byGroup = new Map<string, number[]>();
      for (const stop of line.stops) {
        if (stop.number === null) continue;
        const key = lu.stations[stop.stationId]!.group ?? line.code;
        byGroup.set(key, [...(byGroup.get(key) ?? []), stop.number]);
      }
      for (const [key, nums] of byGroup) expect(new Set(nums).size, `${line.code} ${key}`).toBe(nums.length);
    }
    // Whitechapel (H&C + District) and High Street Kensington (Circle + District) are both District 2.
    expect([num('DIS', 'whitechapel'), num('DIS', 'high-street-kensington')]).toEqual([2, 2]);
  });

  it('has 136 stations, 34 of them interchanges', () => {
    expect(Object.keys(lu.stations)).toHaveLength(136);
    expect(Object.values(lu.stations).filter((s) => s.interchange)).toHaveLength(34);
  });

  it('matches the expected stop and numbered-station counts per line', () => {
    const counts = Object.fromEntries(
      lu.lines.map((l) => [l.code, [l.stops.length, l.stops.filter((s) => s.number !== null).length]]),
    );
    expect(counts).toEqual({
      BAK: [18, 10],
      CEN: [20, 11],
      CIR: [35, 24],
      DIS: [38, 26],
      'H&C': [25, 18],
      JUB: [20, 11],
      MET: [10, 5],
      NOR: [32, 19],
      PIC: [19, 8],
      VIC: [12, 4],
    });
  });

  describe('subsurface lines share track', () => {
    it('keeps stations served only by subsurface lines plain (Sloane Square, Goldhawk Road)', () => {
      expect(lu.stations['sloane-square']).toMatchObject({ interchange: false, lines: ['CIR', 'DIS'] });
      expect(lu.stations['goldhawk-road']).toMatchObject({ interchange: false, lines: ['CIR', 'H&C'] });
    });

    it('makes a subsurface station with another line an unnumbered interchange (Victoria)', () => {
      expect(lu.stations.victoria).toMatchObject({ interchange: true, number: null, lines: ['CIR', 'DIS', 'VIC'] });
    });

    it('makes West Ham an interchange of the District, H&C and Jubilee', () => {
      expect(lu.stations['west-ham']).toMatchObject({ interchange: true, lines: ['DIS', 'H&C', 'JUB'] });
    });
  });

  describe('numbering groups', () => {
    const yes = (st: string, line: string) => lu.stations[st]!.lines.includes(line);
    /** The group the yes/no/any table gives a station, from the subsurface lines serving it. */
    const tableGroup = (st: string) => {
      const [c, h, m, d] = SUBSURFACE.map((l) => yes(st, l));
      if (m && !d) return 'met';
      if (c && h && !m && !d) return 'cir-hc';
      if (!c && h && !m && d) return 'hc-dis';
      if (c && !h && !m && d) return 'cir-dis';
      if (!c && !h && !m && d) return 'dis';
      return null;
    };

    it('puts every subsurface station in the group the table gives, and Paddington and Edgware Road in group 1', () => {
      const subsurface = Object.values(lu.stations).filter((s) => s.lines.some((l) => SUBSURFACE.includes(l)));
      expect(subsurface).toHaveLength(56);
      for (const st of subsurface) {
        const expected = ['paddington', 'edgware-road-circle'].includes(st.id) ? 'cir-hc' : tableGroup(st.id);
        expect(st.group, st.id).toBe(expected);
      }
      expect(lu.groups.map((g) => g.id)).toEqual(['cir-hc', 'met', 'hc-dis', 'cir-dis', 'dis']);
    });

    it('numbers each group from its west or north end', () => {
      const ids = [
        'hammersmith-hc',
        'edgware-road-circle',
        'aldgate',
        'aldgate-east',
        'sloane-square',
        'tower-hill',
        'turnham-green',
        'kensington-olympia',
      ];
      expect(ids.map((id) => lu.stations[id]!.number)).toEqual([1, 9, 5, 1, 3, 10, 1, 10]);
      // A group station has its number on every line serving it.
      expect(lu.stations['sloane-square']!.numbers).toEqual({ CIR: 3, DIS: 3 });
      expect([num('CIR', 'royal-oak'), num('CIR', 'sloane-square')]).toEqual([8, 3]);
    });

    it('leaves group interchanges unnumbered', () => {
      for (const id of ['paddington', 'baker-street', 'mile-end', 'earls-court']) {
        expect(lu.stations[id], id).toMatchObject({ interchange: true, number: null });
      }
    });

    it('numbers the Metropolitan 1–5 from Finchley Road', () => {
      expect(lu.lineByCode.MET!.stops.map((s) => s.number)).toEqual([null, null, 1, 2, null, 3, 4, null, null, 5]);
    });
  });
});
