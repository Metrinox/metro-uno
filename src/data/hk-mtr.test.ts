import { hongKongMtr } from './hk-mtr';
import { loadNetwork } from './network';

const hk = loadNetwork(hongKongMtr);
const num = (line: string, station: string) =>
  hk.lineByCode[line]!.stops.find((s) => s.stationId === station)?.number;

describe('Hong Kong MTR heavy rail data', () => {
  it('has exactly the 8 heavy rail lines and no Light Rail', () => {
    expect(hk.lines.map((l) => l.code)).toEqual(['ISL', 'TWL', 'KTL', 'TKL', 'TCL', 'EAL', 'TML', 'SIL']);
    expect(hk.lines.some((l) => /light rail/i.test(l.name.en))).toBe(false);
  });

  it('merges Disneyland Resort into the Tung Chung Line', () => {
    expect(hk.stations['disneyland-resort']!.lines).toEqual(['TCL']);
    expect(hk.lines.some((l) => /disneyland/i.test(l.name.en) && l.code !== 'TCL')).toBe(false);
    expect(hk.stations['sunny-bay']!.interchange).toBe(false);
  });

  it('merges the Airport Express into the Tung Chung Line', () => {
    expect(hk.lines.some((l) => /airport express/i.test(l.name.en) && l.code !== 'TCL')).toBe(false);
    expect(hk.stations.airport!.lines).toEqual(['TCL']);
    expect(hk.stations['asiaworld-expo']!.lines).toEqual(['TCL']);
    expect(hk.lineByCode.TCL!.branchFrom).toEqual([null, 'sunny-bay', 'tsing-yi']);
  });

  it('makes Hong Kong, Kowloon and Tsing Yi single-line, numbered stations', () => {
    for (const id of ['hong-kong', 'kowloon', 'tsing-yi']) {
      expect(hk.stations[id]!.interchange, id).toBe(false);
      expect(hk.stations[id]!.numbers.TCL, id).toEqual(expect.any(Number));
    }
    expect(['hong-kong', 'kowloon', 'tsing-yi', 'airport', 'asiaworld-expo'].map((id) => num('TCL', id))).toEqual([
      1, 2, 4, 8, 9,
    ]);
  });

  it('labels the Tung Chung Line TCL, DRL and AEL, each in its own colour', () => {
    const labels = hk.lineByCode.TCL!.labels;
    expect(labels.map((l) => l.code)).toEqual(['TCL', 'DRL', 'AEL']);
    expect(new Set(labels.map((l) => l.colour)).size).toBe(3);
    expect(hk.lineByCode.ISL!.labels).toEqual([{ code: 'ISL', colour: '#007DC5' }]);
  });

  it('links Hong Kong with Central, and TST with East TST, both ways', () => {
    expect(hk.stations['hong-kong']!.transfer).toEqual({ to: 'central', lines: ['ISL', 'TWL'] });
    expect(hk.stations.central!.transfer).toEqual({ to: 'hong-kong', lines: ['TCL'] });
    expect(hk.stations.central!.interchange).toBe(true);
    expect(hk.stations['tsim-sha-tsui']!.transfer).toEqual({ to: 'east-tsim-sha-tsui', lines: ['TML'] });
    expect(hk.stations['east-tsim-sha-tsui']!.transfer).toEqual({ to: 'tsim-sha-tsui', lines: ['TWL'] });
    // Transfers keep the stations numbered and single-line.
    expect([num('TCL', 'hong-kong'), num('TWL', 'tsim-sha-tsui'), num('TML', 'east-tsim-sha-tsui')]).toEqual([1, 1, 13]);
  });

  it('has 17 interchanges', () => {
    expect(Object.values(hk.stations).filter((s) => s.interchange)).toHaveLength(17);
  });

  it('has 98 stations', () => {
    expect(Object.keys(hk.stations)).toHaveLength(98);
  });

  it('gives every line a unique code, both names and a colour', () => {
    for (const line of hk.lines) {
      expect(line.name.en).not.toBe('');
      expect(line.name.zh).not.toBe('');
      expect(line.colour).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('gives every station non-empty English and Chinese names', () => {
    for (const st of Object.values(hk.stations)) {
      expect(st.name.en.trim()).not.toBe('');
      expect(st.name.zh.trim()).not.toBe('');
    }
  });

  it('makes Admiralty a four-line interchange', () => {
    expect([...hk.stations.admiralty!.lines].sort()).toEqual(['EAL', 'ISL', 'SIL', 'TWL']);
    expect(hk.stations.admiralty!.interchange).toBe(true);
  });

  it('skips interchanges when numbering (East Rail Line)', () => {
    expect(num('EAL', 'admiralty')).toBeNull();
    expect(num('EAL', 'exhibition-centre')).toBe(1);
    expect(num('EAL', 'hung-hom')).toBeNull();
    expect(num('EAL', 'mong-kok-east')).toBe(2);
  });

  it('numbers branches after the trunk (Tseung Kwan O Line)', () => {
    const [hh, pl, lp] = [num('TKL', 'hang-hau'), num('TKL', 'po-lam'), num('TKL', 'lohas-park')];
    expect(new Set([hh, pl, lp]).size).toBe(3);
    expect(lp).toBe(pl! + 1);
  });

  it('makes Racecourse a loop from Sha Tin rejoining at University', () => {
    const eal = hk.lineByCode.EAL!;
    const b = eal.stops.find((s) => s.stationId === 'racecourse')!.branch;
    expect(eal.branchFrom[b]).toBe('sha-tin');
    expect(eal.branchTo[b]).toBe('university');
    expect(num('EAL', 'racecourse')).toBe(11);
  });

  it('gives Fo Tan and Racecourse different numbers', () => {
    expect(num('EAL', 'fo-tan')).not.toBe(num('EAL', 'racecourse'));
  });

  it('never repeats a number on a line', () => {
    for (const line of hk.lines) {
      const nums = line.stops.map((s) => s.number).filter((n) => n !== null);
      expect(new Set(nums).size, line.code).toBe(nums.length);
    }
  });

  it('matches the expected station count per line', () => {
    const counts = Object.fromEntries(hk.lines.map((l) => [l.code, l.stops.length]));
    expect(counts).toEqual({ ISL: 17, TWL: 16, KTL: 17, TKL: 8, TCL: 11, EAL: 16, TML: 27, SIL: 5 });
  });
});
