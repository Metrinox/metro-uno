import type { Line } from '../../data/network';

/**
 * Lays out a line for the line strip: the trunk runs left to right on row 0,
 * and each branch starts one column beside the station it leaves from, on its
 * own row so branches never overlap. By default a branch heads right on a row
 * above the trunk (row -1, -2, ...); its `draw` hint can send it left, or onto
 * a row below the trunk (row 1, 2, ...). A loop (a branch with a rejoin
 * station) also gets a track back to where it rejoins.
 */

export interface StripStop {
  stationId: string;
  number: number | null;
  col: number;
  /** 0 = trunk; negative = branch rows above it, positive = rows below it. */
  row: number;
  /** Colour of the first label that covers this station. */
  colour: string;
}

export interface StripSegment {
  from: string;
  to: string;
  /** One colour per label covering this section, drawn side by side. */
  colours: string[];
}

export interface StripLayout {
  stops: StripStop[];
  segments: StripSegment[];
  cols: number;
  /** Lowest (most negative) row used. */
  minRow: number;
  /** Highest row used (positive when a branch is drawn below the trunk). */
  maxRow: number;
}

export function layoutLine(line: Line): StripLayout {
  const pos = new Map<string, { col: number; row: number }>();
  const used = new Set<string>();
  const cell = (col: number, row: number) => `${col},${row}`;
  const segments: StripSegment[] = [];

  const covers = (code: string, a: string, b: string) => {
    const label = line.labels.find((l) => l.code === code)!;
    return !label.stations || (label.stations.includes(a) && label.stations.includes(b));
  };
  const segment = (from: string, to: string): StripSegment => {
    const colours = line.labels.filter((l) => covers(l.code, from, to)).map((l) => l.colour);
    return { from, to, colours: colours.length > 0 ? colours : [line.colour] };
  };

  const branchCount = line.branchFrom.length;
  const branchIds = (b: number) => line.stops.filter((s) => s.branch === b).map((s) => s.stationId);

  // A loop that leaves the trunk and rejoins it further along in the direction it is
  // drawn (e.g. the Circle's southern side, from Aldgate back to Paddington) is drawn
  // as a ring: the trunk between its two ends is spread out until the loop's stations
  // fit between them, so the track back to the trunk is a short step. Gaps the loop's
  // `close` hint names are left alone, unless it names them all.
  const trunk = branchIds(0);
  const gaps = trunk.slice(1).map(() => 1);
  for (let b = 1; b < branchCount; b++) {
    const fi = trunk.indexOf(line.branchFrom[b]!);
    const ri = line.branchTo[b] ? trunk.indexOf(line.branchTo[b]!) : -1;
    if (fi < 0 || ri < 0) continue;
    const toward = line.branchDraw[b]?.toward ?? 'right';
    if ((toward === 'right') !== ri > fi) continue;
    const [lo, hi] = [Math.min(fi, ri), Math.max(fi, ri)];
    const need = branchIds(b).length + 1;
    let span = gaps.slice(lo, hi).reduce((n, g) => n + g, 0);
    const all = Array.from({ length: hi - lo }, (_, i) => lo + i);
    const open = all.filter((g) => !line.branchDraw[b]?.close.includes(trunk[g]!));
    const spread = open.length > 0 ? open : all;
    for (let i = 0; span < need; i = (i + 1) % spread.length, span++) gaps[spread[i]!]!++;
  }

  for (let b = 0; b < branchCount; b++) {
    const ids = branchIds(b);
    if (b === 0) {
      let col = 0;
      ids.forEach((id, i) => {
        if (i > 0) col += gaps[i - 1]!;
        pos.set(id, { col, row: 0 });
        used.add(cell(col, 0));
        if (i > 0) segments.push(segment(ids[i - 1]!, id));
      });
      continue;
    }
    const fork = line.branchFrom[b]!;
    const start = pos.get(fork)!;
    const { toward, side } = line.branchDraw[b] ?? { toward: 'right', side: 'above', close: [] };
    const dx = toward === 'left' ? -1 : 1;
    const dy = side === 'below' ? 1 : -1;
    const cols = ids.map((_, i) => start.col + dx * (1 + i));
    let row = (dy < 0 ? Math.min(start.row, 0) : Math.max(start.row, 0)) + dy;
    while (cols.some((c) => used.has(cell(c, row)))) row += dy;
    ids.forEach((id, i) => {
      pos.set(id, { col: cols[i]!, row });
      used.add(cell(cols[i]!, row));
      segments.push(segment(i === 0 ? fork : ids[i - 1]!, id));
    });
    const rejoin = line.branchTo[b];
    if (rejoin) segments.push(segment(ids[ids.length - 1]!, rejoin));
  }

  // A branch heading left from near the start of the trunk can reach negative columns.
  const shift = -Math.min(0, ...[...pos.values()].map((p) => p.col));
  const stops: StripStop[] = line.stops.map((s) => {
    const p = { ...pos.get(s.stationId)!, col: pos.get(s.stationId)!.col + shift };
    const label = line.labels.find((l) => !l.stations || l.stations.includes(s.stationId));
    return { stationId: s.stationId, number: s.number, col: p.col, row: p.row, colour: label?.colour ?? line.colour };
  });

  return {
    stops,
    segments,
    cols: Math.max(...stops.map((s) => s.col)) + 1,
    minRow: Math.min(...stops.map((s) => s.row)),
    maxRow: Math.max(...stops.map((s) => s.row)),
  };
}
