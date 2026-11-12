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
      'docs/reference',
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
              group: ['../storage*', '../app*', '../copy*', '../design*', '../../*'],
              message: 'The domain may not import outside src/domain.',
            },
          ],
        },
      ],
    },
  },
);
