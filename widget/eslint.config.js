import { createRequire } from 'node:module';

import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const require = createRequire(import.meta.url);
const requireFromTsEslint = createRequire(require.resolve('typescript-eslint/package.json'));
const tsestreeForTypescriptEslint = requireFromTsEslint('@typescript-eslint/typescript-estree');

if (typeof tsestreeForTypescriptEslint.addCandidateTSConfigRootDir !== 'function') {
  const modernTsestree = require('@typescript-eslint/typescript-estree');
  tsestreeForTypescriptEslint.addCandidateTSConfigRootDir =
    modernTsestree.addCandidateTSConfigRootDir || (() => {});
}

export default [
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
