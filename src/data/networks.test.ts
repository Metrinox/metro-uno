import { DEFAULT_NETWORK_ID, NETWORKS, networkById, networkOrDefault } from './networks';

describe('available networks', () => {
  it('lists Hong Kong then London, with different ids', () => {
    expect(NETWORKS.map((n) => n.id)).toEqual(['hk-mtr', 'london-underground']);
    expect(new Set(NETWORKS.map((n) => n.id)).size).toBe(NETWORKS.length);
    expect(NETWORKS.every((n) => n.name.en.trim() !== '')).toBe(true);
  });

  it('defaults to Hong Kong', () => {
    expect(DEFAULT_NETWORK_ID).toBe('hk-mtr');
    expect(networkOrDefault(undefined).id).toBe('hk-mtr');
    expect(networkOrDefault('nope').id).toBe('hk-mtr');
    expect(networkOrDefault('london-underground').id).toBe('london-underground');
  });

  it('returns nothing for an unknown id', () => {
    expect(networkById('nope')).toBeUndefined();
    expect(networkById('london-underground')?.name.en).toBe('London Underground');
  });
});
