import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    css: { include: [/\.css\?raw/] }, // let ?raw imports of CSS return their text
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**/*.ts'],
      exclude: ['src/domain/testing/**', 'src/domain/index.ts'],
      thresholds: { lines: 95, branches: 90 },
    },
  },
});
