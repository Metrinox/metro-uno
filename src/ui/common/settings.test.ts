import { DEFAULT_RULES } from '../../engine/game';
import { loadMap, loadRules, saveMap, saveRules } from './settings';

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, v),
  };
}

const blocked = () => {
  throw new Error('SecurityError');
};

describe('house rules storage', () => {
  it('defaults when nothing is saved', () => {
    const store = memoryStorage();
    expect(loadRules(() => store)).toEqual(DEFAULT_RULES);
  });

  it('remembers saved rules', () => {
    const store = memoryStorage();
    const rules = { ...DEFAULT_RULES, handSize: 5, drawUntilPlayable: true };
    saveRules(rules, () => store);
    expect(loadRules(() => store)).toEqual(rules);
  });

  it('falls back to defaults when storage is blocked or corrupt', () => {
    expect(loadRules(blocked)).toEqual(DEFAULT_RULES);
    expect(() => saveRules(DEFAULT_RULES, blocked)).not.toThrow();
    const store = memoryStorage();
    store.setItem('metro-uno.rules', '{not json');
    expect(loadRules(() => store)).toEqual(DEFAULT_RULES);
  });

  it('clamps an out-of-range saved hand size', () => {
    const store = memoryStorage();
    store.setItem('metro-uno.rules', JSON.stringify({ handSize: 500 }));
    expect(loadRules(() => store).handSize).toBe(15);
  });
});

describe('map storage', () => {
  it('defaults to Hong Kong when nothing is saved', () => {
    expect(loadMap(() => memoryStorage())).toBe('hk-mtr');
  });

  it('remembers the chosen map', () => {
    const store = memoryStorage();
    saveMap('london-underground', () => store);
    expect(loadMap(() => store)).toBe('london-underground');
  });

  it('falls back to Hong Kong for an unknown map', () => {
    const store = memoryStorage();
    saveMap('atlantis', () => store);
    expect(loadMap(() => store)).toBe('hk-mtr');
  });

  it('survives storage that throws', () => {
    expect(loadMap(blocked)).toBe('hk-mtr');
    expect(() => saveMap('london-underground', blocked)).not.toThrow();
  });
});
