import type { ExportData } from '../domain/exportFormat';
import type { ArohexisDB } from './db';

/**
 * Replaces everything with an imported backup in one read-write transaction (spec §7.3). Any
 * failure, such as a duplicate id, aborts the transaction and leaves the data as it was.
 */
export function replaceAllData(db: ArohexisDB, data: ExportData): Promise<void> {
  const settings = Object.entries(data.settings)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => ({ key, value }));
  return db.transaction(
    'rw',
    [db.events, db.feelings, db.responses, db.parts, db.obstacles, db.plans, db.kv],
    async () => {
      await Promise.all(
        [db.events, db.feelings, db.responses, db.parts, db.obstacles, db.plans, db.kv].map((t) =>
          t.clear(),
        ),
      );
      await db.events.bulkAdd(data.events);
      await db.feelings.bulkAdd(data.feelings);
      await db.responses.bulkAdd(data.responses);
      await db.parts.bulkAdd(data.parts);
      await db.obstacles.bulkAdd(data.obstacles);
      await db.plans.bulkAdd(data.plans);
      // 'seeded' keeps the defaults from being added again on the next open.
      await db.kv.bulkAdd([...settings, { key: 'seeded', value: true }]);
    },
  );
}
