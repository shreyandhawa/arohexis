import type { ArohexisDB } from '../../storage/db';
import { seedDefaults } from '../../storage/seed';

/** Deletes everything in this database, then puts the defaults back, in one transaction. Irreversible. */
export async function deleteEverything(db: ArohexisDB): Promise<void> {
  const tables = [db.events, db.feelings, db.responses, db.parts, db.obstacles, db.plans, db.kv];
  await db.transaction('rw', tables, async () => {
    await Promise.all(tables.map((t) => t.clear()));
    await seedDefaults(db);
  });
}
