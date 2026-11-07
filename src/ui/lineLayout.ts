import type { Line } from '../data/network';

/**
 * Lays out a line for the line strip: the trunk runs left to right on row 0,
 * and each branch starts one column after the station it leaves from, on its
 * own row above the trunk (row -1, -2, ...) so branches never overlap. A loop
 * (a branch with a rejoin station) also gets a track back to where it rejoins.
 */

export interface StripStop {
  stationId: string;
  number: number | null;
  col: number;
  /** 0 = trunk; negative = branch rows above it. */
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
  for (let b = 0; b < branchCount; b++) {
    const ids = line.stops.filter((s) => s.branch === b).map((s) => s.stationId);
    if (b === 0) {
      ids.forEach((id, i) => {
        pos.set(id, { col: i, row: 0 });
        used.add(cell(i, 0));
        if (i > 0) segments.push(segment(ids[i - 1]!, id));
      });
      continue;
    }
    const fork = line.branchFrom[b]!;
    const start = pos.get(fork)!;
    const cols = ids.map((_, i) => start.col + 1 + i);
    let row = Math.min(start.row, 0) - 1;
    while (cols.some((c) => used.has(cell(c, row)))) row--;
    ids.forEach((id, i) => {
      pos.set(id, { col: cols[i]!, row });
      used.add(cell(cols[i]!, row));
      segments.push(segment(i === 0 ? fork : ids[i - 1]!, id));
    });
    const rejoin = line.branchTo[b];
    if (rejoin) segments.push(segment(ids[ids.length - 1]!, rejoin));
  }

  const stops: StripStop[] = line.stops.map((s) => {
    const p = pos.get(s.stationId)!;
    const label = line.labels.find((l) => !l.stations || l.stations.includes(s.stationId));
    return { stationId: s.stationId, number: s.number, col: p.col, row: p.row, colour: label?.colour ?? line.colour };
  });

  return {
    stops,
    segments,
    cols: Math.max(...stops.map((s) => s.col)) + 1,
    minRow: Math.min(...stops.map((s) => s.row)),
  };
}
