import Dexie, { type EntityTable } from 'dexie';
import type { Feeling, FeelingResponse, ListItem, Part, Plan } from '../domain/config';
import type { AppEvent } from '../domain/events';
import { migrateTaskTypes } from '../domain/parts';

export type DbName = 'arohexis' | 'arohexis-demo' | `test-${string}`;
export type KvRow = { key: string; value: unknown };

export class ArohexisDB extends Dexie {
  events!: EntityTable<AppEvent, 'id'>;
  feelings!: EntityTable<Feeling, 'id'>;
  responses!: EntityTable<FeelingResponse, 'id'>;
  parts!: EntityTable<Part, 'id'>;
  obstacles!: EntityTable<ListItem, 'id'>;
  plans!: EntityTable<Plan, 'id'>;
  kv!: EntityTable<KvRow, 'key'>;

  constructor(name: DbName) {
    super(name);
    // Let a newer version in another tab upgrade; never hold it up.
    this.on('versionchange', () => {
      this.close();
      return false;
    });
    this.version(1).stores({
      events: 'id, at, type, attemptId, planId, [type+at]',
      feelings: 'id, order',
      responses: 'id, feelingId, order',
      taskTypes: 'id, order',
      obstacles: 'id, order',
      plans: 'id, active',
      kv: 'key',
    });
    // M1's task types become parts (spec §16.3). Version 1 stays declared so the upgrade can read it.
    this.version(2)
      .stores({ parts: 'id, order', taskTypes: null })
      .upgrade(async (tx) => {
        const taskTypes = await tx.table<ListItem>('taskTypes').toArray();
        await tx.table<Part>('parts').bulkPut(migrateTaskTypes(taskTypes));
      });
  }
}
