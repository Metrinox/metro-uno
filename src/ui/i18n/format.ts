import type { Network, WildTheme } from '../../data/network';
import { cardLines, type Card, type WildType } from '../../engine/cards';
import { lineOptions } from '../../engine/game';
import { localName, type Dict, type Lang } from './i18n';

/** Black or white text, whichever reads better on `hex`. */
export function textOn(hex: string): string {
  const v = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  return lum > 0.3 ? '#111' : '#fff';
}

/** Text label for a line, e.g. "ISL" or "TCL·DRL·AEL" for a merged line. */
export function lineCode(network: Network, code: string): string {
  return network.lineByCode[code]?.labels.map((l) => l.code).join('·') ?? code;
}

export function lineName(network: Network, code: string, lang: Lang): string {
  const line = network.lineByCode[code];
  return line ? localName(line.name, lang) : code;
}

/** Names of one or more current lines, e.g. "Circle / District". */
export function linesName(network: Network, codes: readonly string[], lang: Lang): string {
  return codes.map((c) => lineName(network, c, lang)).join(' / ');
}

export function stationName(network: Network, id: string, lang: Lang): string {
  const station = network.stations[id];
  return station ? localName(station.name, lang) : id;
}

/** The network's theme for a wild role: `octopus` is the plain wild, `typhoon` the wild draw 4. */
export function wildTheme(network: Network, wild: WildType): WildTheme {
  return wild === 'octopus' ? network.wilds.wild : network.wilds.draw4;
}

/** Short name for a card, used in messages. */
export function cardName(card: Card, network: Network, lang: Lang, t: Dict): string {
  switch (card.kind) {
    case 'station':
      return `${stationName(network, card.stationId, lang)} (${cardLines(card).map((l) => lineCode(network, l)).join('·')} ${card.number})`;
    case 'interchange': {
      // Shared-track lines are grouped as on the card: "CIR·H&C·MET/NOR/PIC/VIC".
      const groups = lineOptions(card.lines, network.sharedLines).map((o) => o.map((l) => lineCode(network, l)).join('·'));
      return `${stationName(network, card.stationId, lang)} (${groups.join('/')})`;
    }
    case 'action':
      return `${lineCode(network, card.line)} ${t.actionName[card.action]}`;
    case 'wild':
      return localName(wildTheme(network, card.wild).name, lang);
  }
}

/** Full accessible description of a card. */
export function cardLabel(card: Card, network: Network, lang: Lang, t: Dict): string {
  switch (card.kind) {
    case 'station': {
      const base = `${stationName(network, card.stationId, lang)}, ${linesName(network, cardLines(card), lang)} ${card.number}`;
      const to = network.stations[card.stationId]?.transfer?.to;
      return to ? `${base}. ${t.transferTo(stationName(network, to, lang))}` : base;
    }
    case 'interchange': {
      const base = `${stationName(network, card.stationId, lang)}, ${t.interchange}: ${card.lines
        .map((l) => lineName(network, l, lang))
        .join(', ')}`;
      const to = network.stations[card.stationId]?.transfer?.to;
      return to ? `${base}. ${t.transferTo(stationName(network, to, lang))}` : base;
    }
    case 'action':
      return `${t.actionName[card.action]}, ${lineName(network, card.line, lang)}`;
    case 'wild':
      return localName(wildTheme(network, card.wild).name, lang);
  }
}

/** Sort key for the human's hand: by line, then number; wilds last. */
export function handOrder(network: Network) {
  const lineIdx = (code: string) => network.lines.findIndex((l) => l.code === code);
  const key = (c: Card): [number, number, number] => {
    switch (c.kind) {
      case 'station':
        return [lineIdx(c.line), 0, c.number];
      case 'action':
        return [lineIdx(c.line), 1, 0];
      case 'interchange':
        return [lineIdx(c.lines[0]!), 2, 0];
      case 'wild':
        return [99, c.wild === 'octopus' ? 0 : 1, 0];
    }
  };
  return (a: Card, b: Card) => {
    const [x, y] = [key(a), key(b)];
    return x[0] - y[0] || x[1] - y[1] || x[2] - y[2] || a.id.localeCompare(b.id);
  };
}
