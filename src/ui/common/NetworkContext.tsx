import { createContext, useContext, type ReactNode } from 'react';
import type { Network } from '../../data/network';
import { networkOrDefault } from '../../data/networks';

/** Outside any provider, components see the default map (Hong Kong). */
const NetworkContext = createContext<Network>(networkOrDefault(undefined));

/** Sets the map that cards, line strips and messages below it are drawn from. */
export function NetworkProvider({ network, children }: { network: Network; children: ReactNode }) {
  return <NetworkContext.Provider value={network}>{children}</NetworkContext.Provider>;
}

/** The map of the round (or page) being shown. */
export function useNetwork(): Network {
  return useContext(NetworkContext);
}
