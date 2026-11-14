import Dexie from 'dexie';
import type { AppEvent, EventOf, EventType } from '../domain/events';
import type { EventStore } from '../domain/ports';
import type { ArohexisDB } from './db';

export function createEventStore(db: ArohexisDB): EventStore {
  return {
    async append(events) {
      if (events.length === 0) return;
      await db.transaction('rw', db.events, () => db.events.bulkAdd([...events]));
    },
    async list(range = {}) {
      const { from, to } = range;
      if (from === undefined && to === undefined) return db.events.orderBy('at').toArray();
      const lower = from ?? Number.NEGATIVE_INFINITY;
      const upper = to ?? Number.POSITIVE_INFINITY;
      return db.events.where('at').between(lower, upper, true, true).toArray();
    },
    listByAttempt(attemptId) {
      return db.events.where('attemptId').equals(attemptId).sortBy('at');
    },
    async listByType<T extends EventType>(type: T) {
      const rows = await db.events
        .where('[type+at]')
        .between([type, Dexie.minKey], [type, Dexie.maxKey], true, true)
        .toArray();
      return rows as EventOf<T>[];
    },
    async appendResolutions(events) {
      if (events.length === 0) return;
      await db.transaction('rw', db.events, async () => {
        const done = new Set<string>();
        for (const type of ['occurrence.resolved', 'lapse.repaired'] as const) {
          const rows = await db.events
            .where('[type+at]')
            .between([type, Dexie.minKey], [type, Dexie.maxKey], true, true)
            .toArray();
          for (const r of rows as (EventOf<'occurrence.resolved'> | EventOf<'lapse.repaired'>)[])
            done.add(`${r.planId}|${r.occurrence}`);
        }
        const fresh = events.filter((e) => {
          const key = `${e.planId}|${e.occurrence}`;
          if (done.has(key)) return false;
          done.add(key);
          return true;
        });
        if (fresh.length) await db.events.bulkAdd(fresh);
      });
    },
    appendForAttempt(attemptId, decide) {
      return db.transaction('rw', db.events, async () => {
        const events = await db.events.where('attemptId').equals(attemptId).sortBy('at');
        const out: AppEvent[] = decide(events);
        if (out.length) await db.events.bulkAdd(out);
        return out;
      });
    },
  };
}
