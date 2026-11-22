/**
 * Metro network data format and loader.
 *
 * A city is described as plain data (`NetworkDef`). `loadNetwork` validates it
 * and derives interchanges and station numbers, so adding a city never means
 * changing the game rules.
 */

export interface LocalizedName {
  en: string;
  /** Traditional Chinese. Optional: names without one show in English. */
  zh?: string;
}

export interface BranchDef {
  /** Station on this line (trunk or an earlier branch) where the branch leaves. */
  from: string;
  /** Station on this line where the branch rejoins, for a loop (e.g. Racecourse). Omitted for a spur. */
  to?: string;
  /** Branch stations in order, not including `from`. */
  stations: string[];
  /** How the line strip draws this branch. Display only; defaults to `{ toward: 'right', side: 'above' }`. */
  draw?: BranchDraw;
}

/** Which way a branch heads from its fork in the line strip, and which side of the trunk it sits on. */
export interface BranchDraw {
  toward?: 'left' | 'right';
  side?: 'above' | 'below';
  /**
   * For a loop drawn as a ring: trunk stations kept next to the station after them
   * while the rest of the trunk between the loop's ends is spread out. Defaults to none.
   */
  close?: string[];
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

/** Artwork for a wild card face. `ring` is the line-colour ring used by draw-4 wilds. */
export type WildArt = 'octopus' | 'oyster' | 'ring';

/** How a network names and draws one wild role. Display only: rules never change. */
export interface WildTheme {
  name: LocalizedName;
  art: WildArt;
}

/**
 * A network's wild-card theme, by engine role: `wild` is the plain wild
 * (engine id `octopus`), `draw4` the wild + draw 4 (engine id `typhoon`).
 */
export interface WildThemes {
  wild: WildTheme;
  draw4: WildTheme;
}

/** A route drawn like a line: a trunk plus branches. */
export interface RouteDef {
  trunk: string[];
  branches?: BranchDef[];
}

/**
 * A numbering group: stations on shared-track lines numbered together, in order,
 * skipping interchanges, as a line is. Players never see the group itself.
 */
export interface NumberingGroupDef extends RouteDef {
  id: string;
}

/**
 * Lines that share track (e.g. London's Circle, H&C, Metropolitan and District).
 * They count as one line when deciding interchanges, so a station served only by
 * them is a plain station on several lines, numbered within its group.
 */
export interface SharedTrackDef {
  /** The lines, in the order they are shown on cards and in line options. */
  lines: string[];
  groups: NumberingGroupDef[];
}

export interface NetworkDef {
  id: string;
  name: LocalizedName;
  stations: Record<string, LocalizedName>;
  lines: LineDef[];
  transfers?: TransferDef[];
  wilds: WildThemes;
  /** Lines that share track, with their numbering groups. */
  sharedTrack?: SharedTrackDef;
}

export interface LineStop {
  stationId: string;
  /** Number on this line, or null for an interchange. */
  number: number | null;
  /** 0 for the trunk, 1.. for branches in definition order. */
  branch: number;
  interchange: boolean;
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
  /** How each branch is drawn, aligned with `branchFrom` (index 0 unused). */
  branchDraw: Required<BranchDraw>[];
}

export interface Station {
  id: string;
  name: LocalizedName;
  /** Codes of lines serving this station, in network line order. */
  lines: string[];
  interchange: boolean;
  /** Number on each line it serves (its group number on shared-track lines); null when interchange. */
  numbers: Record<string, number | null>;
  /** The card's number, or null for an interchange. */
  number: number | null;
  /** The numbering group of a station on shared-track lines, else null. */
  group: string | null;
  /** Walkway transfer: the station reached and the lines a played card may switch to. */
  transfer: { to: string; lines: string[] } | null;
}

export interface Network {
  id: string;
  name: LocalizedName;
  wilds: WildThemes;
  lines: Line[];
  lineByCode: Record<string, Line>;
  stations: Record<string, Station>;
  /** Shared-track lines in card order; empty when the network has none. */
  sharedLines: string[];
  /** Numbering groups, in order, with their stations in numbering order. */
  groups: { id: string; stationIds: string[] }[];
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}


interface Route {
  segments: string[][];
  branchFrom: (string | null)[];
  branchTo: (string | null)[];
  branchDraw: Required<BranchDraw>[];
  /** Every station on the route, in order. */
  ids: string[];
}

/** Validates a trunk-plus-branches route (`owner` names it in errors, e.g. "Line ISL"). */
function buildRoute(owner: string, route: RouteDef, known: Record<string, LocalizedName>): Route {
  if (route.trunk.length === 0) throw new NetworkError(`${owner} has no stations`);
  const onRoute = new Set<string>();
  const ids: string[] = [];
  const segments: string[][] = [route.trunk, ...(route.branches ?? []).map((b) => b.stations)];
  const branchFrom: (string | null)[] = [null];
  const branchTo: (string | null)[] = [null];
  const branchDraw: Required<BranchDraw>[] = [{ toward: 'right', side: 'above', close: [] }];

  const add = (id: string) => {
    if (!(id in known)) throw new NetworkError(`${owner} references unknown station "${id}"`);
    if (onRoute.has(id)) throw new NetworkError(`${owner} lists station "${id}" twice`);
    onRoute.add(id);
    ids.push(id);
  };

  route.trunk.forEach(add);
  for (const branch of route.branches ?? []) {
    if (!onRoute.has(branch.from)) {
      throw new NetworkError(`${owner} has a branch from "${branch.from}", which is not on that line before the branch`);
    }
    if (branch.stations.length === 0) throw new NetworkError(`${owner} has an empty branch from "${branch.from}"`);
    branch.stations.forEach(add);
    branchFrom.push(branch.from);
    branchTo.push(branch.to ?? null);
    const close = branch.draw?.close ?? [];
    for (const id of close) {
      if (!route.trunk.includes(id)) throw new NetworkError(`${owner} keeps "${id}" close, which is not on its main route`);
    }
    branchDraw.push({ toward: branch.draw?.toward ?? 'right', side: branch.draw?.side ?? 'above', close });
  }
  for (const b of route.branches ?? []) {
    if (b.to === undefined) continue;
    if (!onRoute.has(b.to)) throw new NetworkError(`${owner} has a branch rejoining at "${b.to}", which is not on that line`);
    if (b.to === b.from) throw new NetworkError(`${owner} has a branch that rejoins where it starts ("${b.from}")`);
  }
  return { segments, branchFrom, branchTo, branchDraw, ids };
}

export function loadNetwork(def: NetworkDef): Network {
  if (def.lines.length === 0) throw new NetworkError(`Network "${def.id}" has no lines`);

  const seenCodes = new Set<string>();
  const membership: Record<string, string[]> = {};

  // Pass 1: validate structure and collect which lines serve each station.
  const routes = def.lines.map((line) => {
    if (seenCodes.has(line.code)) throw new NetworkError(`Duplicate line code "${line.code}"`);
    seenCodes.add(line.code);
    const route = buildRoute(`Line ${line.code}`, line, def.stations);
    for (const id of route.ids) (membership[id] ??= []).push(line.code);
    return { line, route };
  });

  // Shared-track lines count as one line when deciding interchanges.
  const shared = def.sharedTrack;
  const sharedLines = shared?.lines ?? [];
  if (shared) {
    for (const code of sharedLines) {
      if (!seenCodes.has(code)) throw new NetworkError(`Shared-track line "${code}" is not a line in the network`);
    }
    if (new Set(sharedLines).size < 2) throw new NetworkError('Shared track needs at least two different lines');
  }
  const isShared = (code: string) => sharedLines.includes(code);
  const isInterchange = (id: string) => {
    const served = membership[id] ?? [];
    const others = served.filter((l) => !isShared(l)).length;
    return others + (served.some(isShared) ? 1 : 0) >= 2;
  };

  // Numbering groups: every station on a shared-track line is in exactly one.
  const groupOf: Record<string, string> = {};
  const groupNumber: Record<string, number> = {};
  const groups: { id: string; stationIds: string[] }[] = [];
  for (const g of shared?.groups ?? []) {
    const route = buildRoute(`Group ${g.id}`, g, def.stations);
    let next = 1;
    for (const id of route.ids) {
      if (!(membership[id] ?? []).some(isShared)) {
        throw new NetworkError(`Group ${g.id} lists "${id}", which no shared-track line serves`);
      }
      if (groupOf[id]) throw new NetworkError(`Station "${id}" is in groups ${groupOf[id]} and ${g.id}`);
      groupOf[id] = g.id;
      if (!isInterchange(id)) groupNumber[id] = next++;
    }
    groups.push({ id: g.id, stationIds: route.ids });
  }
  if (shared) {
    for (const [id, served] of Object.entries(membership)) {
      if (served.some(isShared) && !groupOf[id]) throw new NetworkError(`Station "${id}" is on a shared-track line but in no group`);
    }
  }

  // Pass 2: number stops. Interchanges are skipped and the count runs on across
  // branches; a station in a group takes its group number instead.
  const lines: Line[] = routes.map(({ line, route }) => {
    let next = 1;
    const stops: LineStop[] = [];
    route.segments.forEach((segment, branch) => {
      for (const stationId of segment) {
        const interchange = isInterchange(stationId);
        const number = interchange ? null : groupOf[stationId] ? groupNumber[stationId]! : next++;
        stops.push({ stationId, branch, number, interchange });
      }
    });
    const labels = line.labels && line.labels.length > 0 ? line.labels : [{ code: line.code, colour: line.colour }];
    const onLine = new Set(route.ids);
    for (const label of labels) {
      for (const id of label.stations ?? []) {
        if (!onLine.has(id)) throw new NetworkError(`Label ${label.code} on line ${line.code} covers "${id}", which is not on that line`);
      }
    }
    const { branchFrom, branchTo, branchDraw } = route;
    return { code: line.code, name: line.name, colour: line.colour, labels, stops, branchFrom, branchTo, branchDraw };
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
    const interchange = isInterchange(id);
    const number = interchange ? null : numbers[servedBy[0]!]!;
    stations[id] = { id, name, lines: servedBy, interchange, numbers, number, group: groupOf[id] ?? null, transfer: null };
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

  return { id: def.id, name: def.name, wilds: def.wilds, lines, lineByCode, stations, sharedLines, groups };
}
