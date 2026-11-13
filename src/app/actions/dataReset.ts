import type { ArohexisDB } from '../../storage/db';
import { seedDefaults } from '../../storage/seed';

/** Deletes everything in this database, then puts the defaults back. Irreversible. */
export async function deleteEverything(db: ArohexisDB): Promise<void> {
  await db.transaction(
    'rw',
    [db.events, db.feelings, db.responses, db.parts, db.obstacles, db.plans, db.kv],
    async () => {
      await Promise.all(
        [db.events, db.feelings, db.responses, db.parts, db.obstacles, db.plans, db.kv].map((t) =>
          t.clear(),
        ),
      );
    },
  );
  await seedDefaults(db);
}
