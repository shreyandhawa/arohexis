import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { testDeps } from '../../domain/testing/fixtures';
import { createConfigStore } from '../../storage/configStore';
import type { ArohexisDB } from '../../storage/db';
import { createEventStore } from '../../storage/eventStore';
import { openStorage } from '../../storage/open';
import type { AppDeps } from '../data/DataProvider';
import {
  addFeeling,
  addObstacle,
  editResponse,
  moveFeeling,
  renameFeeling,
  renameObstacle,
} from './lists';
import { deleteEverything } from './dataReset';

const opened: ArohexisDB[] = [];

async function setup(): Promise<AppDeps> {
  const result = await openStorage(`test-${crypto.randomUUID()}`);
  if (!result.ok) throw result.error;
  opened.push(result.db);
  const { clock, ids } = testDeps();
  return {
    db: result.db,
    events: createEventStore(result.db),
    config: createConfigStore(result.db),
    clock,
    ids,
    persist: vi.fn().mockResolvedValue(true),
    mode: 'main',
  };
}

afterEach(async () => {
  vi.restoreAllMocks();
  for (const db of opened.splice(0)) {
    db.close();
    await db.delete();
  }
});

describe('lists', () => {
  it('reports a missing id instead of doing nothing', async () => {
    const d = await setup();
    expect(await renameFeeling(d, 'nope', 'Calm')).toBe('missing');
    expect(await renameObstacle(d, 'nope', 'Calm')).toBe('missing');
    expect(await editResponse(d, 'nope', { body: 'One step' })).toBe('missing');
    expect(await editResponse(d, 'nope', {})).toBe('missing');
    const f = (await d.db.feelings.toArray())[0];
    expect(await renameFeeling(d, f!.id, 'Calm')).toBeUndefined();
  });

  it('runs move and add inside one transaction each', async () => {
    const d = await setup();
    const f = (await d.db.feelings.orderBy('order').toArray())[1]!;
    const spy = vi.spyOn(d.db, 'transaction');
    await moveFeeling(d, f.id, -1);
    await addFeeling(d, 'Restless');
    await addObstacle(d, 'Noise');
    expect(spy).toHaveBeenCalledTimes(3);
  });
});

describe('deleteEverything', () => {
  it('clears and reseeds in one transaction', async () => {
    const d = await setup();
    await addFeeling(d, 'Restless');
    const spy = vi.spyOn(d.db, 'transaction');
    await deleteEverything(d.db);
    expect(await d.db.feelings.count()).toBe(6);
    // the clear is the only top-level transaction; seeding nests inside it
    expect(spy.mock.calls.filter((c) => c[0] === 'rw').length).toBe(2);
    expect(await d.db.kv.get('seeded')).toBeDefined();
  });

  it('rolls the clear back when seeding fails', async () => {
    const d = await setup();
    await addFeeling(d, 'Restless');
    vi.spyOn(d.db.feelings, 'bulkAdd').mockRejectedValue(new Error('boom'));
    await expect(deleteEverything(d.db)).rejects.toThrow();
    expect(await d.db.feelings.count()).toBe(7);
  });
});
