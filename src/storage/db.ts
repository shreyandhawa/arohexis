import Dexie, { type EntityTable } from 'dexie';
import type { Feeling, FeelingResponse, ListItem, Plan } from '../domain/config';
import type { AppEvent } from '../domain/events';

export type DbName = 'arohexis' | 'arohexis-demo' | `test-${string}`;
export type KvRow = { key: string; value: unknown };

export class ArohexisDB extends Dexie {
  events!: EntityTable<AppEvent, 'id'>;
  feelings!: EntityTable<Feeling, 'id'>;
  responses!: EntityTable<FeelingResponse, 'id'>;
  taskTypes!: EntityTable<ListItem, 'id'>;
  obstacles!: EntityTable<ListItem, 'id'>;
  plans!: EntityTable<Plan, 'id'>;
  kv!: EntityTable<KvRow, 'key'>;

  constructor(name: DbName) {
    super(name);
    this.version(1).stores({
      events: 'id, at, type, attemptId, planId, [type+at]',
      feelings: 'id, order',
      responses: 'id, feelingId, order',
      taskTypes: 'id, order',
      obstacles: 'id, order',
      plans: 'id, active',
      kv: 'key',
    });
  }
}
