/** Room codes and display names, shared by the browser and the server. */
import { NAME_MAX } from './protocol';

/** Upper-case letters and digits, leaving out the easily confused 0/O and 1/I/L. */
export const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const CODE_LENGTH = 4;

/** Upper-cases and trims what a player typed. */
export function normalizeCode(input: string): string {
  return input.trim().toUpperCase();
}

export function isValidCode(code: string): boolean {
  return code.length === CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c));
}

/** A random code. `randomInt(n)` must return an integer in [0, n). */
export function randomCode(randomInt: (n: number) => number): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

// Control characters, zero-width characters, and bidirectional overrides.
// eslint-disable-next-line no-control-regex
const INVISIBLE = new RegExp('[\\u0000-\\u001f\\u007f-\\u009f\\u200b-\\u200f\\u2028-\\u202e\\u2066-\\u2069]', 'g');

/**
 * Cleans a display name: removes control characters, collapses whitespace,
 * trims, and caps the length at `NAME_MAX` characters. Returns null when
 * nothing is left.
 */
export function sanitizeName(input: string): string | null {
  const cleaned = input.replace(INVISIBLE, '').replace(/\s+/g, ' ').trim();
  const chars = [...cleaned].slice(0, NAME_MAX);
  const name = chars.join('').trim();
  return name.length > 0 ? name : null;
}

/** `name`, or `name 2`, `name 3`… so that it differs from every name in `taken`. */
export function uniqueName(name: string, taken: readonly string[]): string {
  const lower = new Set(taken.map((n) => n.toLowerCase()));
  if (!lower.has(name.toLowerCase())) return name;
  for (let n = 2; ; n++) {
    const suffix = ` ${n}`;
    const base = [...name].slice(0, NAME_MAX - suffix.length).join('').trimEnd();
    const candidate = `${base}${suffix}`;
    if (!lower.has(candidate.toLowerCase())) return candidate;
  }
}
