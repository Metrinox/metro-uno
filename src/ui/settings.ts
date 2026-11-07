import { DEFAULT_RULES, normalizeRules, type HouseRules } from '../engine/game';

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
