import { DEFAULT_SETTINGS, type Config, type Settings } from '../domain/config';
import type { ConfigStore } from '../domain/ports';
import type { ArohexisDB } from './db';

const SETTINGS_KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[];
// Optional settings have no default, so they are not in DEFAULT_SETTINGS.
const OPTIONAL_KEYS: (keyof Settings)[] = ['checkinDismissedWeek', 'lastExportAt'];
const ALL_KEYS = new Set<string>([...SETTINGS_KEYS, ...OPTIONAL_KEYS]);

export async function readConfig(db: ArohexisDB): Promise<Config> {
  const [feelings, responses, taskTypes, obstacles, plans, kv] = await Promise.all([
    db.feelings.orderBy('order').toArray(),
    db.responses.orderBy('order').toArray(),
    db.taskTypes.orderBy('order').toArray(),
    db.obstacles.orderBy('order').toArray(),
    db.plans.toArray(),
    db.kv.toArray(),
  ]);
  const stored: Record<string, unknown> = {};
  for (const row of kv) if (ALL_KEYS.has(row.key)) stored[row.key] = row.value;
  const settings = { ...DEFAULT_SETTINGS, ...stored } as Settings;
  return { feelings, responses, taskTypes, obstacles, plans, settings };
}

export function createConfigStore(db: ArohexisDB): ConfigStore {
  return {
    getConfig: () => readConfig(db),
    async applyConfigPatch(patch) {
      const rows = Object.entries(patch.settings ?? {})
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => ({ key, value }));
      if (rows.length === 0) return;
      await db.transaction('rw', db.kv, () => db.kv.bulkPut(rows));
    },
  };
}
