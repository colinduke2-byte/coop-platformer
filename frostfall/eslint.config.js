// ESLint (flat config): catches real mistakes, not style. `npm run lint` fails on errors only; warnings are informational.
import globals from 'globals';

const rules = {
  'no-undef': 'error',
  'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none', ignoreRestSiblings: true }],
  'no-unsafe-optional-chaining': 'error',
  'no-dupe-keys': 'error',
  'no-unreachable': 'error',
};

// the game only: rules that keep parallel work safe (docs/AGENT_RULES.md)
const srcRules = {
  ...rules,
  'no-restricted-syntax': ['error', {
    selector: "AssignmentExpression[left.type='MemberExpression'][left.object.name='ui'][left.property.name='modal']",
    message: 'Never write ui.modal: take a hold with ui.hold(tag) and call the release it returns (docs/AGENT_RULES.md).',
  }],
};

export default [
  { ignores: ['dist/**', 'node_modules/**', 'test/out/**', 'spike/**', 'frostfall.html'] },
  {
    // the game: browser ES modules bundled by Vite
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: srcRules,
  },
  {
    // tests and tools run in Node, but many functions are sent into the page (h.ev / page.evaluate), so both sets apply
    files: ['test/**/*.mjs', 'test/**/*.js', 'tools/**/*.{js,mjs}', 'eslint.config.js', 'vite.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser, gs: 'readonly' },   // gs(): the Game scene, set on window by many tests
    },
    rules,
  },
  {
    files: ['public/sw.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'script', globals: { ...globals.serviceworker } },
    rules,
  },
];
