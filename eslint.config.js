// Règles de qualité. Les règles d'architecture décrites dans ARCHITECTURE.md sont vérifiées ici :
// un import interdit entre couches ou un fichier trop long fait échouer `npm run lint`.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Les couches du projet et ce que chacune a le droit d'importer.
 * Une couche ne dépend que de celles listées en face : jamais l'inverse.
 */
const LAYERS = {
  core: [],
  data: ['core'],
  engine: ['core', 'data'],
  assets: ['core', 'data'],
  audio: ['core'],
  input: ['core', 'data', 'engine'],
  render: ['core', 'data', 'engine', 'assets'],
  scenes: ['core', 'data', 'engine', 'assets', 'render', 'audio', 'input'],
  ui: ['core', 'data', 'assets', 'render', 'audio', 'input'],
};
const layerNames = Object.keys(LAYERS);

/** Pour une couche : interdit d'importer les autres couches non autorisées, et les fichiers d'assemblage. */
const boundaryRules = layerNames.map((layer) => {
  const forbidden = layerNames.filter((other) => other !== layer && !LAYERS[layer].includes(other));
  return {
    files: [`src/${layer}/**/*.ts`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            ...forbidden.map((other) => ({
              group: [`**/${other}/**`, `**/${other}`],
              message: `La couche « ${layer} » ne doit pas dépendre de « ${other} » (voir ARCHITECTURE.md).`,
            })),
            {
              group: ['**/game', '**/main'],
              message: 'Seuls game.ts et main.ts assemblent les couches : rien ne doit les importer.',
            },
          ],
        },
      ],
    },
  };
});

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: { globals: globals.browser },
    rules: {
      // Taille : on vise 300 lignes utiles par fichier ; au-delà de 400, il faut découper
      // (ou justifier l'exception par un commentaire eslint-disable en tête de fichier).
      'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 90, skipBlankLines: true, skipComments: true }],
      'max-depth': ['error', 4],
      'max-params': ['error', 9],
      eqeqeq: 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      // exports nommés uniquement : un nom se retrouve partout à l'identique
      'no-restricted-syntax': [
        'error',
        { selector: 'ExportDefaultDeclaration', message: 'Utilise un export nommé.' },
      ],
    },
  },
  ...boundaryRules,
  {
    // le moteur doit pouvoir tourner sans navigateur (c'est ce qui le rend testable)
    files: ['src/engine/**/*.ts', 'src/data/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        ...['window', 'document', 'localStorage', 'navigator', 'performance', 'requestAnimationFrame'].map(
          (name) => ({ name, message: 'Le moteur et les données ne touchent pas au navigateur.' }),
        ),
      ],
    },
  },
  {
    files: ['tests/**/*.ts'],
    rules: { 'max-lines-per-function': 'off' },
  },
  {
    files: ['*.config.ts', '*.config.js'],
    languageOptions: { globals: globals.node },
    rules: { 'no-restricted-syntax': 'off' },
  },
  prettier,
);
