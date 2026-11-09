import { hongKongMtr } from '../src/data/hk-mtr';
import { loadNetwork } from '../src/data/network';

/** The network online rounds are played on (the same one the browser uses). */
export const network = loadNetwork(hongKongMtr);
