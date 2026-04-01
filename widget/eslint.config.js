// eslint.config.js

const { createRequire } = require('module');
const js = require('@eslint/js');
const simpleImportSort = require('eslint-plugin-simple-import-sort');
const tseslint = require('typescript-eslint');
const requireFromTsEslint = createRequire(require.resolve('typescript-eslint/package.json'));
const tsestreeForTypescriptEslint = requireFromTsEslint('@typescript-eslint/typescript-estree');

if (typeof tsestreeForTypescriptEslint.addCandidateTSConfigRootDir !== 'function') {
  const modernTsestree = require('@typescript-eslint/typescript-estree');
  tsestreeForTypescriptEslint.addCandidateTSConfigRootDir =
    modernTsestree.addCandidateTSConfigRootDir || (() => {});
}
const reactHooks = require('eslint-plugin-react-hooks');
const globals = require('globals');

module.exports = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'react-hooks': reactHooks,
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'error',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
    ignores: ["artifacthub-widget.js"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
      },
    },
  },
];
