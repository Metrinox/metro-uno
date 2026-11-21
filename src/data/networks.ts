import { hongKongMtr } from './hk-mtr';
import { londonUnderground } from './london-underground';
import { loadNetwork, type Network } from './network';

/** Id of the map used wherever none has been chosen. */
export const DEFAULT_NETWORK_ID = 'hk-mtr';

/** Every map the game offers, in menu order. Loaded (and validated) once. */
export const NETWORKS: readonly Network[] = [loadNetwork(hongKongMtr), loadNetwork(londonUnderground)];

const byId = new Map(NETWORKS.map((n) => [n.id, n]));

/** The map with this id, or undefined for an unknown id. */
export function networkById(id: string): Network | undefined {
  return byId.get(id);
}

/** The map with this id, falling back to the default for a missing or unknown id. */
export function networkOrDefault(id: string | null | undefined): Network {
  return (id != null ? byId.get(id) : undefined) ?? byId.get(DEFAULT_NETWORK_ID)!;
}
