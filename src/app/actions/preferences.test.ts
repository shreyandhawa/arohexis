import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { testDeps } from '../../domain/testing/fixtures';
import { createConfigStore } from '../../storage/configStore';
import type { ArohexisDB } from '../../storage/db';
import { createEventStore } from '../../storage/eventStore';
import { openStorage } from '../../storage/open';
import type { AppDeps } from '../data/DataProvider';
import { setStill } from './preferences';

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

afterEach(() => {
  for (const db of opened.splice(0)) db.close();
});

describe('setStill', () => {
  it('writes the setting', async () => {
    const d = await setup();
    expect((await d.config.getConfig()).settings.brainStill).toBeUndefined();
    await setStill(d, 'still');
    expect((await d.config.getConfig()).settings.brainStill).toBe('still');
    await setStill(d, 'moving');
    expect((await d.config.getConfig()).settings.brainStill).toBe('moving');
  });
});
