import { layoutLine } from './lineLayout';
import { networkOrDefault } from '../../data/networks';

const network = networkOrDefault('hk-mtr');

const layout = (code: string) => layoutLine(network.lineByCode[code]!);
const at = (code: string, id: string) => layout(code).stops.find((s) => s.stationId === id)!;
const seg = (code: string, a: string, b: string) =>
  layout(code).segments.find((s) => s.from === a && s.to === b)?.colours;

const ORANGE = '#F7943E';
const PINK = '#E777CB';
const GREEN = '#00888A';

describe('line strip layout', () => {
  it('draws a line without branches on one row', () => {
    const isl = layout('ISL');
    expect(isl.minRow).toBe(0);
    expect(isl.stops.map((s) => s.col)).toEqual(isl.stops.map((_, i) => i));
  });

  it('starts a branch next to its fork, not after the end of the line', () => {
    // Tseung Kwan O Line: LOHAS Park sits beside Hang Hau, on a branch row.
    expect(at('TKL', 'lohas-park').col).toBe(at('TKL', 'hang-hau').col);
    expect(at('TKL', 'lohas-park').row).toBe(-1);
    expect(at('TKL', 'po-lam').row).toBe(0);
    expect(layout('TKL').segments).toContainEqual({ from: 'tseung-kwan-o', to: 'lohas-park', colours: ['#7D499D'] });
  });

  it('draws Racecourse as a loop from Sha Tin to University, beside Fo Tan', () => {
    expect(at('EAL', 'racecourse').col).toBe(at('EAL', 'fo-tan').col);
    const eal = layout('EAL').segments.map((s) => `${s.from}>${s.to}`);
    expect(eal).toContain('sha-tin>racecourse');
    expect(eal).toContain('racecourse>university');
    expect(eal).not.toContain('fo-tan>racecourse');
  });

  it('places the Lok Ma Chau spur after Sheung Shui', () => {
    expect(at('EAL', 'lok-ma-chau').col).toBe(at('EAL', 'sheung-shui').col + 1);
    expect(at('EAL', 'racecourse').row).toBe(-1);
    expect(at('EAL', 'lok-ma-chau').row).toBe(-1);
  });

  it('stacks overlapping branches on separate rows (Tung Chung Line)', () => {
    expect(at('TCL', 'disneyland-resort')).toMatchObject({ col: at('TCL', 'sunny-bay').col + 1, row: -1 });
    expect(at('TCL', 'airport')).toMatchObject({ col: at('TCL', 'tsing-yi').col + 1, row: -2 });
    expect(at('TCL', 'asiaworld-expo')).toMatchObject({ col: at('TCL', 'tsing-yi').col + 2, row: -2 });
    expect(layout('TCL').cols).toBe(8);
  });

  it('draws orange and green side by side where TCL and AEL share track', () => {
    expect(seg('TCL', 'hong-kong', 'kowloon')).toEqual([ORANGE, GREEN]);
    expect(seg('TCL', 'lai-king', 'tsing-yi')).toEqual([ORANGE, GREEN]);
    expect(seg('TCL', 'tsing-yi', 'sunny-bay')).toEqual([ORANGE]);
    expect(seg('TCL', 'sunny-bay', 'disneyland-resort')).toEqual([PINK]);
    expect(seg('TCL', 'tsing-yi', 'airport')).toEqual([GREEN]);
    expect(seg('TCL', 'airport', 'asiaworld-expo')).toEqual([GREEN]);
  });

  it('colours branch stations by their own service', () => {
    expect(at('TCL', 'disneyland-resort').colour).toBe(PINK);
    expect(at('TCL', 'airport').colour).toBe(GREEN);
    expect(at('TCL', 'kowloon').colour).toBe(ORANGE);
  });

  it('draws District branches the way the map does around Earl\'s Court', () => {
    const dis = layoutLine(networkOrDefault('london-underground').lineByCode.DIS!);
    const pos = (id: string) => dis.stops.find((s) => s.stationId === id)!;
    const ec = pos('earls-court');
    expect(ec.row).toBe(0);
    // Wimbledon branch: below the trunk, heading left.
    expect(pos('west-brompton')).toMatchObject({ row: 1, col: ec.col - 1 });
    expect(pos('east-putney')).toMatchObject({ row: 1, col: ec.col - 5 });
    // Olympia: above, to the left. Edgware Road branch: above, to the right.
    expect(pos('kensington-olympia')).toMatchObject({ row: -1, col: ec.col - 1 });
    expect(pos('high-street-kensington')).toMatchObject({ row: -1, col: ec.col + 1 });
    expect(pos('edgware-road-circle')).toMatchObject({ row: -1, col: ec.col + 5 });
    expect(dis.minRow).toBe(-1);
    expect(dis.maxRow).toBe(1);
    // Every stop has its own cell.
    expect(new Set(dis.stops.map((s) => `${s.col},${s.row}`)).size).toBe(dis.stops.length);
  });

  it('draws the Northern branches the way the map does', () => {
    const nor = layoutLine(networkOrDefault('london-underground').lineByCode.NOR!);
    const pos = (id: string) => nor.stops.find((s) => s.stationId === id)!;
    const camden = pos('camden-town');
    const kennington = pos('kennington');
    // High Barnet branch: above, heading north (left) beside the Hampstead end.
    expect(pos('kentish-town')).toMatchObject({ row: -1, col: camden.col - 1 });
    expect(pos('archway')).toMatchObject({ row: -1, col: camden.col - 3 });
    // Bank loop and Battersea above; the Morden branch carries straight on from Kennington.
    expect(pos('bank').row).toBe(-1);
    expect(pos('nine-elms')).toMatchObject({ row: -1, col: kennington.col + 1 });
    expect(pos('oval')).toMatchObject({ row: 0, col: kennington.col + 1 });
    expect(pos('clapham-south')).toMatchObject({ row: 0, col: kennington.col + 5 });
    expect([nor.minRow, nor.maxRow]).toEqual([-1, 0]);
    expect(new Set(nor.stops.map((s) => `${s.col},${s.row}`)).size).toBe(nor.stops.length);
  });

  describe('London subsurface lines', () => {
    const lu = networkOrDefault('london-underground');
    const strip = (code: string) => layoutLine(lu.lineByCode[code]!);
    const posIn = (l: ReturnType<typeof strip>) => (id: string) => l.stops.find((s) => s.stationId === id)!;

    it('draws the Circle as a ring under the trunk between Paddington and Aldgate', () => {
      const cir = strip('CIR');
      const pos = posIn(cir);
      const [pad, ald] = [pos('paddington'), pos('aldgate')];
      // Aldgate is level with Liverpool Street, at the end of the trunk.
      expect([pos('liverpool-street').row, ald.row]).toEqual([0, 0]);
      expect(ald.col).toBeGreaterThan(pos('liverpool-street').col);
      // The loop runs below the trunk from just left of Aldgate to just right of Paddington…
      expect(pos('tower-hill')).toMatchObject({ row: 1, col: ald.col - 1 });
      expect(pos('bayswater')).toMatchObject({ row: 1, col: pad.col + 1 });
      // …so the trunk between them is spread out to fit it, and nothing shares a cell.
      expect(ald.col - pad.col).toBe(17);
      expect(new Set(cir.stops.map((s) => `${s.col},${s.row}`)).size).toBe(cir.stops.length);
      expect(pos('royal-oak').col + 1).toBe(pad.col);
      // Only Circle stations.
      expect(cir.stops.some((s) => s.stationId === 'finchley-road' || s.stationId === 'whitechapel')).toBe(false);
    });

    it('draws the Metropolitan from Finchley Road to Aldgate, numbered 1 to 5', () => {
      const met = strip('MET');
      expect(met.stops.map((s) => s.stationId)).toEqual(lu.lineByCode.MET!.stops.map((s) => s.stationId));
      expect(met.stops.map((s) => s.number)).toEqual([null, null, 1, 2, null, 3, 4, null, null, 5]);
      expect(met.minRow).toBe(0);
    });

    it('shows Sloane Square as a numbered stop on the District', () => {
      expect(posIn(strip('DIS'))('sloane-square').number).toBe(3);
    });
  });

  it('keeps branches without a draw hint above the trunk, heading right', () => {
    for (const line of networkOrDefault('hk-mtr').lines) {
      const l = layoutLine(line);
      expect(l.maxRow, line.code).toBe(0);
      expect(Math.min(...l.stops.map((s) => s.col)), line.code).toBe(0);
    }
  });
});
