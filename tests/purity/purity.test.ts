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

it('geometry tsconfig rejects DOM globals', () => {
  const r = spawnSync(
    'npx',
    ['tsc', '-p', 'tests/purity/geometry-fixture/tsconfig.json', '--noEmit'],
    {
      encoding: 'utf8',
    },
  );
  expect(r.status).not.toBe(0);
  expect(r.stdout).toContain("Cannot find name 'window'");
});

const rulesFor = async (code: string, filePath: string) => {
  const [res] = await new ESLint().lintText(code, { filePath });
  return res!.messages.map((m) => m.ruleId);
};

it('eslint rejects react imports inside geometry', async () => {
  expect(
    await rulesFor("import React from 'react';\nexport const x = React;\n", 'src/geometry/x.ts'),
  ).toContain('no-restricted-imports');
});

it('eslint rejects imports that leave geometry for the app', async () => {
  expect(
    await rulesFor("import { a } from '../app/x';\nexport const o = a;\n", 'src/geometry/x.ts'),
  ).toContain('no-restricted-imports');
});

it('eslint allows geometry to import from the domain', async () => {
  expect(
    await rulesFor(
      "import { mulberry32 } from '../domain/random';\nexport const o = mulberry32;\n",
      'src/geometry/x.ts',
    ),
  ).not.toContain('no-restricted-imports');
});

it('eslint rejects geometry imports inside the domain', async () => {
  expect(
    await rulesFor(
      "import { buildField } from '../geometry/field';\nexport const o = buildField;\n",
      'src/domain/x.ts',
    ),
  ).toContain('no-restricted-imports');
});
