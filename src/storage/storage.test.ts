import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WeekDay } from '../domain/config';
import { foldAttempts, isCountedStart } from '../domain/attempts';
import { makeStart, openAttempt } from '../domain/commands';
import { testDeps } from '../domain/testing/fixtures';
import { ArohexisDB, type DbName } from './db';
import { createConfigStore } from './configStore';
import { createEventStore } from './eventStore';
import { readExportData } from './exportData';
import { StorageUnavailableError, openStorage, openStorageWithin } from './open';
import { seedDefaults } from './seed';

const opened: ArohexisDB[] = [];

async function freshDb(): Promise<ArohexisDB> {
  const db = new ArohexisDB(`test-${crypto.randomUUID()}`);
  opened.push(db);
  await db.open();
  return db;
}

afterEach(async () => {
  vi.restoreAllMocks();
  for (const db of opened.splice(0)) {
    db.close();
    await db.delete();
  }
});

describe('storage', () => {
  it('seeds defaults once', async () => {
    const db = await freshDb();
    await seedDefaults(db);
    await seedDefaults(db);
    expect(await db.feelings.count()).toBe(6);
    expect(await db.responses.count()).toBe(16);
  });

  it('append is all-or-nothing', async () => {
    const db = await freshDb();
    const store = createEventStore(db);
    const deps = testDeps();
    const a = openAttempt(deps, { source: 'stuck' });
    const b = { ...openAttempt(deps, { source: 'stuck' }), id: a.id };
    await expect(store.append([a, b])).rejects.toThrow();
    expect(await db.events.count()).toBe(0);
  });

  it('listByAttempt returns events in time order', async () => {
    const db = await freshDb();
    const store = createEventStore(db);
    const deps = testDeps();
    const opened = openAttempt(deps, { source: 'stuck' });
    deps.clock.advance(1000);
    const start = makeStart(deps, [opened], opened.attemptId);
    const other = openAttempt(deps, { source: 'stuck' });
    await store.append([...start, other, opened]);
    const got = await store.listByAttempt(opened.attemptId);
    expect(got.map((e) => e.type)).toEqual(['attempt.opened', 'start.made']);
  });

  it('list is inclusive on both ends and listByType is sorted by time', async () => {
    const db = await freshDb();
    const store = createEventStore(db);
    const deps = testDeps();
    const times = [3000, 1000, 2000].map((n) => {
      deps.clock.set(n);
      return openAttempt(deps, { source: 'stuck' });
    });
    await store.append(times);
    expect((await store.list()).map((e) => e.at)).toEqual([1000, 2000, 3000]);
    expect((await store.list({ from: 1000, to: 2000 })).map((e) => e.at)).toEqual([1000, 2000]);
    expect((await store.list({ from: 2500 })).map((e) => e.at)).toEqual([3000]);
    expect((await store.list({ to: 1500 })).map((e) => e.at)).toEqual([1000]);
    expect((await store.listByType('attempt.opened')).map((e) => e.at)).toEqual([1000, 2000, 3000]);
  });

  it('counts every start when attempt.opened and start.made share a millisecond', async () => {
    const db = await freshDb();
    const store = createEventStore(db);
    // Production ids are random UUIDs, so IndexedDB orders equal-`at` rows at random.
    const deps = { ...testDeps(), ids: { next: () => crypto.randomUUID() } };
    const total = 200;
    for (let n = 0; n < total; n++) {
      const opened = openAttempt(deps, { source: 'stuck' });
      await store.append([opened, ...makeStart(deps, [opened], opened.attemptId)]);
    }
    expect(foldAttempts(await store.list()).filter(isCountedStart)).toHaveLength(total);
    // The same rows read per attempt (what appendForAttempt hands the decider).
    const [first] = await store.listByType('attempt.opened');
    const rows = await store.listByAttempt(first!.attemptId);
    expect(foldAttempts(rows).filter(isCountedStart)).toHaveLength(1);
  });

  it('appendForAttempt serializes concurrent starts', async () => {
    const db = await freshDb();
    const store = createEventStore(db);
    const deps = testDeps();
    const opened = openAttempt(deps, { source: 'stuck' });
    await store.append([opened]);
    const id = opened.attemptId;
    const results = await Promise.all([
      store.appendForAttempt(id, (evts) => makeStart(deps, evts, id)),
      store.appendForAttempt(id, (evts) => makeStart(deps, evts, id)),
    ]);
    expect(results.map((r) => r.length).sort()).toEqual([0, 1]);
    const starts = (await store.listByAttempt(id)).filter((e) => e.type === 'start.made');
    expect(starts).toHaveLength(1);
  });

  it('getConfig merges stored settings over defaults', async () => {
    const db = await freshDb();
    await seedDefaults(db);
    const store = createConfigStore(db);
    const before = await store.getConfig();
    expect(before.settings.theme).toBe('system');
    expect(before.feelings.map((f) => f.order)).toEqual([1, 2, 3, 4, 5, 99]);
    await store.applyConfigPatch({ settings: { theme: 'dark', onboarded: true } });
    await db.kv.put({ key: 'schemaVersion', value: 1 });
    const after = await store.getConfig();
    expect(after.settings).toEqual({ ...before.settings, theme: 'dark', onboarded: true });
    expect(after.settings).not.toHaveProperty('seeded');
    expect(after.settings).not.toHaveProperty('schemaVersion');
  });

  it('readExportData returns every table', async () => {
    const db = await freshDb();
    await seedDefaults(db);
    const deps = testDeps();
    const opened = openAttempt(deps, { source: 'stuck' });
    await createEventStore(db).append([opened]);
    await createConfigStore(db).applyConfigPatch({ settings: { weekStartsOn: 0 } });
    const data = await readExportData(db);
    expect(data.events).toEqual([opened]);
    expect(data.feelings).toHaveLength(6);
    expect(data.responses).toHaveLength(16);
    expect(data.parts).toHaveLength(5);
    expect(data.obstacles.length).toBeGreaterThan(0);
    expect(data.plans).toEqual([]);
    expect(data.settings.weekStartsOn).toBe(0);
  });

  it('openStorage opens and seeds', async () => {
    const name: DbName = `test-${crypto.randomUUID()}`;
    const res = await openStorage(name);
    expect(res.ok).toBe(true);
    if (res.ok) {
      opened.push(res.db);
      expect(await res.db.feelings.count()).toBe(6);
    }
  });

  it('openStorageWithin gives up on a hung open', async () => {
    vi.spyOn(ArohexisDB.prototype, 'open').mockReturnValue(
      new Promise(() => undefined) as ReturnType<ArohexisDB['open']>,
    );
    const res = await openStorageWithin(`test-${crypto.randomUUID()}`, 20);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBeInstanceOf(StorageUnavailableError);
  });

  it('openStorageWithin closes a database that opens after the timeout', async () => {
    const realOpen = ArohexisDB.prototype.open;
    vi.spyOn(ArohexisDB.prototype, 'open').mockImplementation(function (this: ArohexisDB) {
      opened.push(this);
      return new Promise((resolve) =>
        setTimeout(() => resolve(realOpen.call(this)), 60),
      ) as ReturnType<ArohexisDB['open']>;
    });
    const close = vi.spyOn(ArohexisDB.prototype, 'close');
    const res = await openStorageWithin(`test-${crypto.randomUUID()}`, 10);
    expect(res.ok).toBe(false);
    await vi.waitFor(() => expect(close).toHaveBeenCalled());
  });

  it('openStorageWithin returns the database when it opens in time', async () => {
    const res = await openStorageWithin(`test-${crypto.randomUUID()}`, 5000);
    expect(res.ok).toBe(true);
    if (res.ok) opened.push(res.db);
  });

  it('openStorage reports unavailable storage', async () => {
    vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      throw new Error('blocked');
    });
    const res = await openStorage(`test-${crypto.randomUUID()}`);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBeInstanceOf(StorageUnavailableError);
      expect(res.error.cause).toBeInstanceOf(Error);
    }
  });

  it('adds, updates and pauses plans', async () => {
    const db = await freshDb();
    await seedDefaults(db);
    const store = createConfigStore(db);
    const part = (await db.parts.toArray())[0];
    const plan = {
      id: 'p1',
      place: 'my desk',
      firstAction: 'open the doc',
      time: '09:00',
      days: [1, 2] as WeekDay[],
      graceMin: 30,
      active: true,
      createdAt: 5,
      editCount: 0,
      ...(part && { partId: part.id }),
    };
    await store.applyConfigPatch({ plans: { add: [plan] } });
    await expect(store.applyConfigPatch({ plans: { add: [plan] } })).rejects.toThrow(/exists/);
    await store.applyConfigPatch({
      plans: { update: [{ ...plan, time: '10:00', createdAt: 99, editCount: 40 }] },
    });
    expect((await store.getConfig()).plans[0]).toMatchObject({
      time: '10:00',
      createdAt: 5,
      editCount: 1,
      partId: part?.id,
    });
    await store.applyConfigPatch({ plans: { pause: ['p1'] } });
    expect((await store.getConfig()).plans[0]).toMatchObject({ active: false, editCount: 1 });
  });

  it('rejects invalid plans without writing anything', async () => {
    const db = await freshDb();
    await seedDefaults(db);
    const store = createConfigStore(db);
    const base = {
      id: 'p1',
      place: '',
      firstAction: 'a',
      time: '09:00',
      days: [1] as WeekDay[],
      graceMin: 30,
      active: true,
      createdAt: 0,
      editCount: 0,
    };
    await expect(
      store.applyConfigPatch({ plans: { add: [{ ...base, time: '9' }] } }),
    ).rejects.toThrow(/Invalid plan/);
    await expect(
      store.applyConfigPatch({ plans: { add: [{ ...base, partId: 'nope' }] } }),
    ).rejects.toThrow(/No such part/);
    await expect(store.applyConfigPatch({ plans: { update: [base] } })).rejects.toThrow(
      /No such plan/,
    );
    await expect(store.applyConfigPatch({ plans: { pause: ['zzz'] } })).rejects.toThrow(
      /No such plan/,
    );
    expect(await db.plans.count()).toBe(0);
  });
});
