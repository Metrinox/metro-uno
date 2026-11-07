/**
 * Metro network data format and loader.
 *
 * A city is described as plain data (`NetworkDef`). `loadNetwork` validates it
 * and derives interchanges and station numbers, so adding a city never means
 * changing the game rules.
 */

export interface LocalizedName {
  en: string;
  zh: string;
}

export interface BranchDef {
  /** Station on this line (trunk or an earlier branch) where the branch leaves. */
  from: string;
  /** Station on this line where the branch rejoins, for a loop (e.g. Racecourse). Omitted for a spur. */
  to?: string;
  /** Branch stations in order, not including `from`. */
  stations: string[];
}

/** One display label for a line: a short code in its own colour. */
export interface LineLabel {
  code: string;
  colour: string;
  /**
   * Stations on the line this service runs through (including ones it passes
   * without stopping). Omitted = the whole line. Display only.
   */
  stations?: string[];
}

export interface LineDef {
  /** Unique short code, e.g. "ISL". */
  code: string;
  name: LocalizedName;
  /** Display colour, CSS hex. */
  colour: string;
  /**
   * Display labels for a line made from several real lines (e.g. TCL · DRL · AEL).
   * Display only: the line is still one line for matching. Defaults to `[{ code, colour }]`.
   */
  labels?: LineLabel[];
  /** Main route, in order from the terminus numbering starts at. */
  trunk: string[];
  /** Branches, numbered after the trunk in this order. */
  branches?: BranchDef[];
}

/**
 * A one-way walkway transfer: playing `from` switches to one of `to`'s lines.
 * For a two-way link, list both directions.
 */
export interface TransferDef {
  from: string;
  to: string;
}

export interface NetworkDef {
  id: string;
  name: LocalizedName;
  stations: Record<string, LocalizedName>;
  lines: LineDef[];
  transfers?: TransferDef[];
}

export interface LineStop {
  stationId: string;
  /** Number on this line, or null for an interchange. */
  number: number | null;
  /** 0 for the trunk, 1.. for branches in definition order. */
  branch: number;
}

export interface Line {
  code: string;
  name: LocalizedName;
  colour: string;
  /** Display labels; always at least one. */
  labels: LineLabel[];
  /** Every stop: trunk first, then each branch, in numbering order. */
  stops: LineStop[];
  /** Branch start stations, index-aligned with branch numbers 1.. (index 0 unused). */
  branchFrom: (string | null)[];
  /** Where each branch rejoins the line (loops only), aligned with `branchFrom`. */
  branchTo: (string | null)[];
}

export interface Station {
  id: string;
  name: LocalizedName;
  /** Codes of lines serving this station, in network line order. */
  lines: string[];
  interchange: boolean;
  /** Number on each line it serves; null when interchange. */
  numbers: Record<string, number | null>;
  /** Walkway transfer: the station reached and the lines a played card may switch to. */
  transfer: { to: string; lines: string[] } | null;
}

export interface Network {
  id: string;
  name: LocalizedName;
  lines: Line[];
  lineByCode: Record<string, Line>;
  stations: Record<string, Station>;
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export function loadNetwork(def: NetworkDef): Network {
  if (def.lines.length === 0) throw new NetworkError(`Network "${def.id}" has no lines`);

  const seenCodes = new Set<string>();
  const membership: Record<string, string[]> = {};

  // Pass 1: validate structure and collect which lines serve each station.
  const routes = def.lines.map((line) => {
    if (seenCodes.has(line.code)) throw new NetworkError(`Duplicate line code "${line.code}"`);
    seenCodes.add(line.code);
    if (line.trunk.length === 0) throw new NetworkError(`Line ${line.code} has no stations`);

    const onLine = new Set<string>();
    const segments: string[][] = [line.trunk, ...(line.branches ?? []).map((b) => b.stations)];
    const branchFrom: (string | null)[] = [null];
    const branchTo: (string | null)[] = [null];

    const addStation = (id: string) => {
      if (!(id in def.stations)) {
        throw new NetworkError(`Line ${line.code} references unknown station "${id}"`);
      }
      if (onLine.has(id)) throw new NetworkError(`Line ${line.code} lists station "${id}" twice`);
      onLine.add(id);
      (membership[id] ??= []).push(line.code);
    };

    line.trunk.forEach(addStation);
    for (const branch of line.branches ?? []) {
      if (!onLine.has(branch.from)) {
        throw new NetworkError(
          `Line ${line.code} has a branch from "${branch.from}", which is not on that line before the branch`,
        );
      }
      if (branch.stations.length === 0) {
        throw new NetworkError(`Line ${line.code} has an empty branch from "${branch.from}"`);
      }
      branch.stations.forEach(addStation);
      branchFrom.push(branch.from);
      branchTo.push(branch.to ?? null);
    }
    for (const to of branchTo) {
      if (to === null) continue;
      if (!onLine.has(to)) throw new NetworkError(`Line ${line.code} has a branch rejoining at "${to}", which is not on that line`);
    }
    (line.branches ?? []).forEach((b) => {
      if (b.to === b.from) throw new NetworkError(`Line ${line.code} has a branch that rejoins where it starts ("${b.from}")`);
    });
    return { line, segments, branchFrom, branchTo };
  });

  const isInterchange = (id: string) => (membership[id]?.length ?? 0) >= 2;

  // Pass 2: number stops. Interchanges are skipped; the count runs on across branches.
  const lines: Line[] = routes.map(({ line, segments, branchFrom, branchTo }) => {
    let next = 1;
    const stops: LineStop[] = [];
    segments.forEach((segment, branch) => {
      for (const stationId of segment) {
        stops.push({ stationId, branch, number: isInterchange(stationId) ? null : next++ });
      }
    });
    const labels = line.labels && line.labels.length > 0 ? line.labels : [{ code: line.code, colour: line.colour }];
    const onLine = new Set(stops.map((s) => s.stationId));
    for (const label of labels) {
      for (const id of label.stations ?? []) {
        if (!onLine.has(id)) throw new NetworkError(`Label ${label.code} on line ${line.code} covers "${id}", which is not on that line`);
      }
    }
    return { code: line.code, name: line.name, colour: line.colour, labels, stops, branchFrom, branchTo };
  });

  const lineByCode: Record<string, Line> = {};
  for (const line of lines) lineByCode[line.code] = line;

  const stations: Record<string, Station> = {};
  for (const [id, name] of Object.entries(def.stations)) {
    const servedBy = membership[id];
    if (!servedBy) throw new NetworkError(`Station "${id}" is not on any line`);
    const numbers: Record<string, number | null> = {};
    for (const code of servedBy) {
      numbers[code] = lineByCode[code]!.stops.find((s) => s.stationId === id)!.number;
    }
    stations[id] = { id, name, lines: servedBy, interchange: servedBy.length >= 2, numbers, transfer: null };
  }

  for (const { from, to } of def.transfers ?? []) {
    const label = `Transfer "${from}" → "${to}"`;
    const src = stations[from];
    const dest = stations[to];
    if (!src || !dest) throw new NetworkError(`${label} names an unknown station`);
    if (from === to) throw new NetworkError(`${label} goes nowhere`);
    if (src.transfer) throw new NetworkError(`${label} is a second transfer from the same station`);
    const lines = dest.lines.filter((l) => !src.lines.includes(l));
    if (lines.length === 0) throw new NetworkError(`${label} leads to no other line`);
    src.transfer = { to, lines };
  }

  return { id: def.id, name: def.name, lines, lineByCode, stations };
}
