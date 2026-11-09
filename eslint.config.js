import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'openspec', 'test-results', 'playwright-report', '.wrangler', 'worker-configuration.d.ts'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
  },
  {
    // The engine, data and shared protocol must stay framework- and browser-free
    // so the game server can run the same code (design.md: one-way dependencies).
    files: ['src/engine/**/*.ts', 'src/data/**/*.ts', 'src/shared/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react', 'react-dom', 'react/*', 'react-dom/*'], message: 'engine/data/shared must not depend on React.' },
            { group: ['**/ui', '**/ui/**'], message: 'engine/data/shared must not import from src/ui.' },
          ],
        },
      ],
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'navigator'],
      'no-restricted-properties': ['error', { object: 'Math', property: 'random', message: 'Use the seeded RNG.' }],
    },
  },
  {
    // The game server (a Cloudflare Worker) may use the engine, data and shared
    // code, but never the browser UI or browser-only globals.
    files: ['server/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react', 'react-dom', 'react/*', 'react-dom/*'], message: 'The server must not depend on React.' },
            { group: ['**/ui', '**/ui/**'], message: 'The server must not import from src/ui.' },
          ],
        },
      ],
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'navigator'],
      'no-restricted-properties': ['error', { object: 'Math', property: 'random', message: 'Use crypto or an injected RNG.' }],
    },
  },
);
