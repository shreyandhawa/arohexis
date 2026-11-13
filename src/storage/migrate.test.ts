import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { foldAttempts } from '../domain/attempts';
import { makeStart, openAttempt, tagStart, undoStart } from '../domain/commands';
import type { ListItem } from '../domain/config';
import { DEFAULT_FEELINGS, DEFAULT_PARTS, DEFAULT_RESPONSES } from '../domain/defaults';
import type { AppEvent } from '../domain/events';
import { migrateTaskTypes } from '../domain/parts';
import { testDeps } from '../domain/testing/fixtures';
import type { ArohexisDB, DbName } from './db';
import { createConfigStore } from './configStore';
import { readExportData } from './exportData';
import { openStorage } from './open';

const M1_TASK_TYPES: ListItem[] = [
  { id: 'writing', label: 'Writing', order: 1, enabled: true },
  { id: 'study', label: 'Study', order: 2, enabled: true },
  { id: 'admin', label: 'Admin & email', order: 3, enabled: true },
  { id: 'chores', label: 'Chores', order: 4, enabled: true },
  { id: 'creative', label: 'Creative', order: 5, enabled: true },
  { id: 'other-task', label: 'Other', order: 6, enabled: true },
];

const opened: ArohexisDB[] = [];
const names: string[] = [];

afterEach(async () => {
  for (const db of opened.splice(0)) db.close();
  for (const name of names.splice(0)) await Dexie.delete(name);
});

/** A database exactly as M1 left it: only `version(1)`, with its seed and some events. */
async function buildM1Database(name: DbName): Promise<AppEvent[]> {
  const m1 = new Dexie(name);
  m1.version(1).stores({
    events: 'id, at, type, attemptId, planId, [type+at]',
    feelings: 'id, order',
    responses: 'id, feelingId, order',
    taskTypes: 'id, order',
    obstacles: 'id, order',
    plans: 'id, active',
    kv: 'key',
  });
  await m1.open();
  const deps = testDeps();
  const events: AppEvent[] = [];
  const startTagged = (tag: ListItem | undefined, undo = false) => {
    const o = openAttempt(deps, { source: 'stuck' });
    deps.clock.advance(1000);
    events.push(o);
    const id = o.attemptId;
    events.push(...makeStart(deps, events, id));
    if (tag) events.push(...tagStart(deps, events, id, tag));
    if (undo) events.push(...undoStart(deps, events, id));
    deps.clock.advance(1000);
  };
  startTagged(M1_TASK_TYPES[0]);
  startTagged(M1_TASK_TYPES[5]);
  startTagged(undefined);
  startTagged(M1_TASK_TYPES[1], true);
  await m1.table('taskTypes').bulkAdd(M1_TASK_TYPES);
  await m1.table('feelings').bulkAdd([...DEFAULT_FEELINGS]);
  await m1.table('responses').bulkAdd([...DEFAULT_RESPONSES]);
  await m1.table('kv').put({ key: 'seeded', value: true });
  await m1.table('events').bulkAdd(events);
  m1.close();
  return events;
}

describe('Dexie version 1 to 2', () => {
  it('upgrades an M1 database', async () => {
    const name: DbName = `test-${crypto.randomUUID()}`;
    names.push(name);
    const events = await buildM1Database(name);

    const res = await openStorage(name);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    opened.push(res.db);
    const { db } = res;

    expect(await db.parts.orderBy('order').toArray()).toEqual(migrateTaskTypes(M1_TASK_TYPES));
    expect(db.backendDB().objectStoreNames.contains('taskTypes')).toBe(false);
    const byId = <T extends { id: string }>(rows: readonly T[]) =>
      [...rows].sort((a, b) => a.id.localeCompare(b.id));
    expect(byId(await db.events.toArray())).toEqual(byId(events));
    expect(byId(await db.feelings.toArray())).toEqual(byId(DEFAULT_FEELINGS));
    expect(byId(await db.responses.toArray())).toEqual(byId(DEFAULT_RESPONSES));
    expect(await db.parts.count()).toBe(5);
    // Past tags keep their snapshots; `other-task` simply names no configured part.
    const attempts = foldAttempts(await db.events.toArray());
    expect(attempts.map((a) => a.part?.id)).toEqual(['writing', 'other-task', undefined, 'study']);
  });

  it('a new database seeds the default parts', async () => {
    const name: DbName = `test-${crypto.randomUUID()}`;
    names.push(name);
    const res = await openStorage(name);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    opened.push(res.db);
    expect(await res.db.parts.orderBy('order').toArray()).toEqual([...DEFAULT_PARTS]);
  });
});

describe('config patch with parts', () => {
  async function fresh(): Promise<ArohexisDB> {
    const name: DbName = `test-${crypto.randomUUID()}`;
    names.push(name);
    const res = await openStorage(name);
    if (!res.ok) throw res.error;
    opened.push(res.db);
    return res.db;
  }

  it('applyConfigPatch upserts parts and rejects an invalid set', async () => {
    const db = await fresh();
    const store = createConfigStore(db);
    await store.applyConfigPatch({
      parts: [
        { id: 'work', label: 'Job', order: 1, enabled: true, colour: 1, region: 1 },
        { id: 'art', label: 'Art', order: 6, enabled: true, colour: 6, region: 6 },
      ],
    });
    const after = await store.getConfig();
    expect(after.parts.map((p) => p.label)).toEqual([
      'Job',
      'Study',
      'Health',
      'Home',
      'Money',
      'Art',
    ]);

    await expect(
      store.applyConfigPatch({
        settings: { theme: 'dark' },
        parts: [{ id: 'seven', label: 'Seven', order: 7, enabled: true, colour: 1, region: 1 }],
      }),
    ).rejects.toThrow(/Invalid parts/);
    const unchanged = await store.getConfig();
    expect(unchanged.parts).toEqual(after.parts);
    expect(unchanged.settings.theme).toBe('system');
  });

  it('rejects a patch that changes the region of a stored part', async () => {
    const db = await fresh();
    const store = createConfigStore(db);
    const before = await store.getConfig();
    await expect(
      store.applyConfigPatch({
        parts: [{ id: 'work', label: 'Work', order: 1, enabled: true, colour: 1, region: 6 }],
      }),
    ).rejects.toThrow(/region/);
    expect((await store.getConfig()).parts).toEqual(before.parts);
  });

  it('brainStill round-trips', async () => {
    const db = await fresh();
    const store = createConfigStore(db);
    expect((await store.getConfig()).settings).not.toHaveProperty('brainStill');
    await store.applyConfigPatch({ settings: { brainStill: 'still' } });
    expect((await store.getConfig()).settings.brainStill).toBe('still');
    expect((await readExportData(db)).settings.brainStill).toBe('still');
  });
});
