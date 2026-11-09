import { layoutLine } from './lineLayout';
import { network } from '../common/network';

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
});
