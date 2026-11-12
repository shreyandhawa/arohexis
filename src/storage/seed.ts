import {
  DEFAULT_FEELINGS,
  DEFAULT_OBSTACLES,
  DEFAULT_RESPONSES,
  DEFAULT_PARTS,
} from '../domain/defaults';
import type { ArohexisDB } from './db';

/** Idempotent: the kv 'seeded' row marks a database that already holds the defaults. */
export async function seedDefaults(db: ArohexisDB): Promise<void> {
  await db.transaction(
    'rw',
    [db.feelings, db.responses, db.parts, db.obstacles, db.kv],
    async () => {
      if (await db.kv.get('seeded')) return;
      await db.feelings.bulkAdd([...DEFAULT_FEELINGS]);
      await db.responses.bulkAdd([...DEFAULT_RESPONSES]);
      await db.parts.bulkAdd([...DEFAULT_PARTS]);
      await db.obstacles.bulkAdd([...DEFAULT_OBSTACLES]);
      await db.kv.put({ key: 'seeded', value: true });
    },
  );
}
