// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { dictionaries, loadLang, localName, saveLang } from './i18n';
import { cardLabel, cardName, handOrder, lineName, linesName, stationName } from './format';
import { buildDeck } from '../../engine/cards';
import { loadNetwork } from '../../data/network';
import { networkOrDefault } from '../../data/networks';
import type { Card } from '../../engine/cards';
import { LangProvider, useLang } from './LangContext';

function Probe() {
  const { t, setLang } = useLang();
  return (
    <>
      <h1>{t.start}</h1>
      <button onClick={() => setLang('zh')}>zh</button>
    </>
  );
}

const blocked = () => {
  throw new Error('SecurityError: storage blocked');
};

describe('i18n', () => {
  beforeEach(() => localStorage.clear());

  it('shows the English name in Chinese mode when there is no Chinese name', () => {
    expect(localName({ en: 'Royal Oak' }, 'zh')).toBe('Royal Oak');
    expect(localName({ en: 'Central', zh: '中環' }, 'zh')).toBe('中環');
    const net = loadNetwork({
      id: 'en-only',
      name: { en: 'English only' },
      stations: { a: { en: 'Alpha' }, b: { en: 'Beta' } },
      lines: [{ code: 'L', name: { en: 'Line' }, colour: '#123456', trunk: ['a', 'b'] }],
      wilds: { wild: { name: { en: 'W' }, art: 'ring' }, draw4: { name: { en: 'D' }, art: 'ring' } },
    });
    expect(stationName(net, 'a', 'zh')).toBe('Alpha');
    expect(lineName(net, 'L', 'zh')).toBe('Line');
  });

  it('names wild cards from the network theme in both languages', () => {
    const hk = networkOrDefault('hk-mtr');
    const octopus: Card = { id: 'wild:octopus:1', kind: 'wild', wild: 'octopus' };
    const typhoon: Card = { id: 'wild:typhoon:1', kind: 'wild', wild: 'typhoon' };
    expect(cardName(octopus, hk, 'en', dictionaries.en)).toBe('Octopus');
    expect(cardLabel(typhoon, hk, 'en', dictionaries.en)).toBe('Typhoon Signal No. 8');
    expect(cardName(octopus, hk, 'zh', dictionaries.zh)).toBe('八達通');
    expect(cardLabel(typhoon, hk, 'zh', dictionaries.zh)).toBe('八號風球');
    expect('wildName' in dictionaries.en).toBe(false);
  });

  describe('London subsurface cards', () => {
    const lu = networkOrDefault('london-underground');
    const deck = buildDeck(lu);
    const pick = (id: string) => deck.find((c) => c.id === `st:${id}`)!;

    it('lists every line of a multi-line station in its name and label, in both languages', () => {
      expect(cardName(pick('sloane-square'), lu, 'en', dictionaries.en)).toBe('Sloane Square (CIR·DIS 3)');
      expect(cardLabel(pick('sloane-square'), lu, 'en', dictionaries.en)).toBe('Sloane Square, Circle / District 3');
      expect(cardName(pick('sloane-square'), lu, 'zh', dictionaries.zh)).toBe('Sloane Square (CIR·DIS 3)');
      expect(cardLabel(pick('sloane-square'), lu, 'zh', dictionaries.zh)).toBe('Sloane Square, Circle / District 3');
    });

    it('groups an interchange\'s shared-track lines in its name', () => {
      expect(cardName(pick('kings-cross-st-pancras'), lu, 'en', dictionaries.en)).toBe(
        "King's Cross St Pancras (CIR·H&C·MET/NOR/PIC/VIC)",
      );
    });

    it('names every current line in a line change, in both languages', () => {
      expect(dictionaries.en.ev.lineChanged(linesName(lu, ['CIR', 'DIS'], 'en'))).toBe('Now on the Circle / District');
      expect(dictionaries.zh.ev.lineChanged(linesName(lu, ['CIR', 'DIS'], 'zh'))).toBe('現在是Circle / District');
    });

    it('sorts a multi-line card under its first line, by number', () => {
      // Circle: Bayswater 1 and Sloane Square 3 (Circle + District), Royal Oak 8 (Circle + H&C).
      const hand = ['royal-oak', 'sloane-square', 'parsons-green', 'bayswater'].map(pick);
      expect(hand.sort(handOrder(lu)).map((c) => c.id)).toEqual(['st:bayswater', 'st:sloane-square', 'st:royal-oak', 'st:parsons-green']);
    });
  });

  it('has the same keys in both dictionaries', () => {
    const keys = (o: object): string[] =>
      Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v).map((s) => `${k}.${s}`) : [k]));
    expect(keys(dictionaries.zh).sort()).toEqual(keys(dictionaries.en).sort());
  });

  it('switches language and remembers it', () => {
    render(
      <LangProvider>
        <Probe />
      </LangProvider>,
    );
    expect(screen.getByRole('heading').textContent).toBe('Start');
    act(() => screen.getByText('zh').click());
    expect(screen.getByRole('heading').textContent).toBe('開始');
    expect(loadLang()).toBe('zh');
    expect(document.documentElement.lang).toBe('zh-Hant-HK');
  });

  it('falls back to English when storage is blocked', () => {
    expect(loadLang(blocked)).toBe('en');
    expect(() => saveLang('zh', blocked)).not.toThrow();
    const getter = vi.spyOn(window, 'localStorage', 'get').mockImplementation(blocked);
    render(
      <LangProvider>
        <Probe />
      </LangProvider>,
    );
    expect(screen.getAllByRole('heading').at(-1)!.textContent).toBe('Start');
    getter.mockRestore();
  });
});
