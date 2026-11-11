import { spawnSync } from 'node:child_process';
import { ESLint } from 'eslint';
import { expect, it } from 'vitest';

it('domain tsconfig rejects DOM globals', () => {
  const r = spawnSync('npx', ['tsc', '-p', 'tests/purity/fixture/tsconfig.json', '--noEmit'], {
    encoding: 'utf8',
  });
  expect(r.status).not.toBe(0);
  expect(r.stdout).toContain("Cannot find name 'window'");
});

it('eslint rejects react imports inside domain', async () => {
  const [res] = await new ESLint().lintText(
    "import React from 'react';\nexport const x = React;\n",
    {
      filePath: 'src/domain/x.ts',
    },
  );
  expect(res!.messages.map((m) => m.ruleId)).toContain('no-restricted-imports');
});

it('eslint rejects storage imports inside domain', async () => {
  const [res] = await new ESLint().lintText(
    "import { openStorage } from '../storage/open';\nexport const o = openStorage;\n",
    { filePath: 'src/domain/x.ts' },
  );
  expect(res!.messages.map((m) => m.ruleId)).toContain('no-restricted-imports');
});
