import type { ExportData } from '../domain/exportFormat';
import { readConfig } from './configStore';
import type { ArohexisDB } from './db';

/** One consistent snapshot of every table, for the backup export. */
export function readExportData(db: ArohexisDB): Promise<ExportData> {
  return db.transaction(
    'r',
    [db.events, db.feelings, db.responses, db.taskTypes, db.obstacles, db.plans, db.kv],
    async () => ({ ...(await readConfig(db)), events: await db.events.orderBy('at').toArray() }),
  );
}
