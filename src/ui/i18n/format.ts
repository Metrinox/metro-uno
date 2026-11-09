import type { Network } from '../../data/network';
import type { Card } from '../../engine/cards';
import type { Dict, Lang } from './i18n';

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
  return network.lineByCode[code]?.name[lang] ?? code;
}

export function stationName(network: Network, id: string, lang: Lang): string {
  return network.stations[id]?.name[lang] ?? id;
}

/** Short name for a card, used in messages. */
export function cardName(card: Card, network: Network, lang: Lang, t: Dict): string {
  switch (card.kind) {
    case 'station':
      return `${stationName(network, card.stationId, lang)} (${lineCode(network, card.line)} ${card.number})`;
    case 'interchange':
      return `${stationName(network, card.stationId, lang)} (${card.lines.map((l) => lineCode(network, l)).join('/')})`;
    case 'action':
      return `${lineCode(network, card.line)} ${t.actionName[card.action]}`;
    case 'wild':
      return t.wildName[card.wild];
  }
}

/** Full accessible description of a card. */
export function cardLabel(card: Card, network: Network, lang: Lang, t: Dict): string {
  switch (card.kind) {
    case 'station': {
      const base = `${stationName(network, card.stationId, lang)}, ${lineName(network, card.line, lang)} ${card.number}`;
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
      return t.wildName[card.wild];
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
