import { validateParts } from '../domain/parts';
import { validatePlan } from '../domain/plans';
import { DEFAULT_SETTINGS, type Config, type Plan, type Settings } from '../domain/config';
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
      const { add = [], update = [], pause = [] } = patch.plans ?? {};
      const touchesPlans = add.length + update.length + pause.length > 0;
      if (rows.length === 0 && parts.length === 0 && !touchesPlans) return;
      await db.transaction('rw', [db.kv, db.parts, db.plans], async () => {
        if (parts.length > 0) {
          for (const p of parts) {
            const stored = await db.parts.get(p.id);
            if (stored && stored.region !== p.region)
              throw new Error(`A part never changes region: ${p.id}`);
          }
          await db.parts.bulkPut([...parts]);
          const problems = validateParts(await db.parts.toArray());
          if (problems.length > 0) throw new Error(`Invalid parts: ${problems.join(', ')}`);
        }
        if (touchesPlans) {
          const next: Plan[] = [];
          for (const plan of add) {
            if (await db.plans.get(plan.id)) throw new Error(`Plan already exists: ${plan.id}`);
            next.push(plan);
          }
          for (const plan of update) {
            const stored = await db.plans.get(plan.id);
            if (!stored) throw new Error(`No such plan: ${plan.id}`);
            next.push({
              ...plan,
              createdAt: stored.createdAt,
              editCount: stored.editCount + 1,
            });
          }
          for (const id of pause) {
            const stored = await db.plans.get(id);
            if (!stored) throw new Error(`No such plan: ${id}`);
            next.push({ ...stored, active: false });
          }
          for (const plan of next) {
            const problems = validatePlan(plan);
            if (problems.length > 0)
              throw new Error(`Invalid plan ${plan.id}: ${problems.join(', ')}`);
            if (plan.partId !== undefined && !(await db.parts.get(plan.partId)))
              throw new Error(`No such part: ${plan.partId}`);
          }
          await db.plans.bulkPut(next);
        }
        if (rows.length > 0) await db.kv.bulkPut(rows);
      });
    },
  };
}
