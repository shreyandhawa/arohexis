import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'dev-dist',
      'coverage',
      'node_modules',
      'tests/purity/fixture',
      'tests/purity/geometry-fixture',
      'docs/reference',
      '.worktrees',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react/*', 'react-*', 'dexie', 'dexie-*'],
              message: 'The domain stays free of UI and storage libraries.',
            },
            {
              group: [
                '../storage*',
                '../app*',
                '../copy*',
                '../design*',
                '../geometry*',
                '../../*',
              ],
              message: 'The domain may not import outside src/domain.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/geometry/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react/*', 'react-*', 'dexie', 'dexie-*'],
              message: 'Geometry stays free of UI and storage libraries.',
            },
            {
              group: ['../storage*', '../app*', '../copy*', '../design*', '../main*', '../../*'],
              message: 'Geometry may import from src/domain only.',
            },
            {
              regex: '^[^.]',
              message:
                'Geometry takes no packages; it imports relative paths into src/domain only.',
            },
          ],
        },
      ],
    },
  },
  {
    // Tests may use the test libraries; their relative imports stay inside geometry and the domain.
    files: ['src/geometry/**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react/*', 'react-*', 'dexie', 'dexie-*'],
              message: 'Geometry stays free of UI and storage libraries.',
            },
            {
              group: ['../storage*', '../app*', '../copy*', '../design*', '../main*', '../../*'],
              message: 'Geometry may import from src/domain only.',
            },
          ],
        },
      ],
    },
  },
);
