import { CODE_ALPHABET, isValidCode, normalizeCode, randomCode, sanitizeName, uniqueName } from './rooms';

describe('room codes', () => {
  it('leaves out confusable characters', () => {
    for (const c of '01OIL') expect(CODE_ALPHABET).not.toContain(c);
  });

  it('matches lower-case entry', () => {
    expect(normalizeCode(' k7mx ')).toBe('K7MX');
    expect(isValidCode(normalizeCode('k7mx'))).toBe(true);
  });

  it.each(['K7M', 'K7MXX', 'K0MX', 'KOMX', 'K1MX', 'KIMX', 'KLMX', 'k7mx', 'K7-X'])('rejects %s', (code) => {
    expect(isValidCode(code)).toBe(false);
  });

  it('makes valid random codes', () => {
    let i = 0;
    const seq = [0, 30, 5, 17];
    const code = randomCode(() => seq[i++ % seq.length]!);
    expect(code).toBe(`${CODE_ALPHABET[0]}${CODE_ALPHABET[30]}${CODE_ALPHABET[5]}${CODE_ALPHABET[17]}`);
    expect(isValidCode(code)).toBe(true);
  });
});

describe('display names', () => {
  it('trims and collapses whitespace', () => {
    expect(sanitizeName('  Ka   Ho  ')).toBe('Ka Ho');
  });

  it('strips control and invisible formatting characters', () => {
    expect(sanitizeName('Me\u0000i\u202e')).toBe('Mei');
  });

  it('rejects names that are empty after cleaning', () => {
    expect(sanitizeName('')).toBeNull();
    expect(sanitizeName('   ')).toBeNull();
    expect(sanitizeName('\u0007\u0008')).toBeNull();
  });

  it('caps names at 20 characters, counting Chinese characters as one each', () => {
    expect(sanitizeName('x'.repeat(30))).toBe('x'.repeat(20));
    expect(sanitizeName('港'.repeat(25))).toBe('港'.repeat(20));
  });

  it('keeps markup as plain text', () => {
    expect(sanitizeName('<b>Sam</b>')).toBe('<b>Sam</b>');
  });

  it('adds a number to duplicates', () => {
    expect(uniqueName('Sam', ['Mei'])).toBe('Sam');
    expect(uniqueName('Sam', ['Sam'])).toBe('Sam 2');
    expect(uniqueName('sam', ['Sam', 'Sam 2'])).toBe('sam 3');
    expect(uniqueName('x'.repeat(20), ['x'.repeat(20)])).toBe(`${'x'.repeat(18)} 2`);
  });
});
