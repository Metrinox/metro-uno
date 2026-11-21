import { DEFAULT_RULES, normalizeRules, type HouseRules } from '../../engine/game';
import { DEFAULT_NETWORK_ID, networkById } from '../../data/networks';

const RULES_KEY = 'metro-uno.rules';

/** Reads saved house rules; any storage or parse failure gives the defaults. */
export function loadRules(storage: () => Storage | undefined = () => globalThis.localStorage): HouseRules {
  try {
    const raw = storage()?.getItem(RULES_KEY);
    return raw ? normalizeRules(JSON.parse(raw) as Partial<HouseRules>) : { ...DEFAULT_RULES };
  } catch {
    return { ...DEFAULT_RULES };
  }
}

/** Saves house rules; storage failures are ignored. */
export function saveRules(rules: HouseRules, storage: () => Storage | undefined = () => globalThis.localStorage): void {
  try {
    storage()?.setItem(RULES_KEY, JSON.stringify(rules));
  } catch {
    /* storage unavailable: the rules just aren't remembered */
  }
}

const NAME_KEY = 'metro-uno.name';

/** The name last used for online play, or ''. */
export function loadName(storage: () => Storage | undefined = () => globalThis.localStorage): string {
  try {
    return storage()?.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveName(name: string, storage: () => Storage | undefined = () => globalThis.localStorage): void {
  try {
    storage()?.setItem(NAME_KEY, name);
  } catch {
    /* storage unavailable */
  }
}

const MAP_KEY = 'metro-uno.map';

/** The id of the map last chosen on the setup screen; Hong Kong when none is saved or it is unknown. */
export function loadMap(storage: () => Storage | undefined = () => globalThis.localStorage): string {
  try {
    const id = storage()?.getItem(MAP_KEY);
    return id && networkById(id) ? id : DEFAULT_NETWORK_ID;
  } catch {
    return DEFAULT_NETWORK_ID;
  }
}

/** Saves the chosen map id; storage failures are ignored. */
export function saveMap(id: string, storage: () => Storage | undefined = () => globalThis.localStorage): void {
  try {
    storage()?.setItem(MAP_KEY, id);
  } catch {
    /* storage unavailable: the map just isn't remembered */
  }
}
