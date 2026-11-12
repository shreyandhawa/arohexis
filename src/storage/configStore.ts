import { validateParts } from '../domain/parts';
import { DEFAULT_SETTINGS, type Config, type Settings } from '../domain/config';
import type { ConfigStore } from '../domain/ports';
import type { ArohexisDB } from './db';

const SETTINGS_KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[];
// Optional settings have no default, so they are not in DEFAULT_SETTINGS.
const OPTIONAL_KEYS: (keyof Settings)[] = ['checkinDismissedWeek', 'lastExportAt', 'brainStill'];
const ALL_KEYS = new Set<string>([...SETTINGS_KEYS, ...OPTIONAL_KEYS]);

export async function readConfig(db: ArohexisDB): Promise<Config> {
  const [feelings, responses, parts, obstacles, plans, kv] = await Promise.all([
    db.feelings.orderBy('order').toArray(),
    db.responses.orderBy('order').toArray(),
    db.parts.orderBy('order').toArray(),
    db.obstacles.orderBy('order').toArray(),
    db.plans.toArray(),
    db.kv.toArray(),
  ]);
  const stored: Record<string, unknown> = {};
  for (const row of kv) if (ALL_KEYS.has(row.key)) stored[row.key] = row.value;
  const settings = { ...DEFAULT_SETTINGS, ...stored } as Settings;
  return { feelings, responses, parts, obstacles, plans, settings };
}

export function createConfigStore(db: ArohexisDB): ConfigStore {
  return {
    getConfig: () => readConfig(db),
    async applyConfigPatch(patch) {
      const rows = Object.entries(patch.settings ?? {})
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => ({ key, value }));
      const parts = patch.parts ?? [];
      if (rows.length === 0 && parts.length === 0) return;
      await db.transaction('rw', [db.kv, db.parts], async () => {
        if (parts.length > 0) {
          await db.parts.bulkPut([...parts]);
          const problems = validateParts(await db.parts.toArray());
          if (problems.length > 0) throw new Error(`Invalid parts: ${problems.join(', ')}`);
        }
        if (rows.length > 0) await db.kv.bulkPut(rows);
      });
    },
  };
}
