// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { dictionaries, loadLang, saveLang } from './i18n';
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
