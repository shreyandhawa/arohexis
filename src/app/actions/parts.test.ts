import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { foldAttempts } from '../../domain/attempts';
import { projectBrainSpace } from '../../domain/brainSpace';
import { testDeps } from '../../domain/testing/fixtures';
import { createConfigStore } from '../../storage/configStore';
import type { ArohexisDB } from '../../storage/db';
import { createEventStore } from '../../storage/eventStore';
import { openStorage } from '../../storage/open';
import type { AppDeps } from '../data/DataProvider';
import { addPart, recolorPart, renamePart, setPartEnabled } from './parts';
import { beginStuck, start, tag } from './stuck';

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

describe('parts actions', () => {
  it('adding a sixth part gives region 6', async () => {
    const d = await setup();
    expect(await addPart(d, 'Art')).toBeUndefined();
    const { parts } = await d.config.getConfig();
    expect(parts).toHaveLength(6);
    expect(parts.find((p) => p.label === 'Art')).toMatchObject({ region: 6, colour: 6 });
  });

  it('a seventh returns limit and writes nothing', async () => {
    const d = await setup();
    await addPart(d, 'Art');
    expect(await addPart(d, 'Music')).toBe('limit');
    expect((await d.config.getConfig()).parts).toHaveLength(6);
  });

  it('rejects a bad label and writes nothing', async () => {
    const d = await setup();
    expect(await addPart(d, '   ')).toBe('label');
    expect(await renamePart(d, 'work', 'x'.repeat(25))).toBe('label');
    const { parts } = await d.config.getConfig();
    expect(parts).toHaveLength(5);
    expect(parts.find((p) => p.id === 'work')?.label).toBe('Work');
  });

  it('renames a part and keeps its region', async () => {
    const d = await setup();
    expect(await renamePart(d, 'work', ' Job ')).toBeUndefined();
    const part = (await d.config.getConfig()).parts.find((p) => p.id === 'work');
    expect(part).toMatchObject({ label: 'Job', region: 1 });
  });

  it('recoloring to a colour another part holds swaps the two', async () => {
    const d = await setup();
    expect(await recolorPart(d, 'work', 2)).toBeUndefined();
    const { parts } = await d.config.getConfig();
    expect(parts.find((p) => p.id === 'work')?.colour).toBe(2);
    expect(parts.find((p) => p.id === 'study')?.colour).toBe(1);
  });

  it('disabling a part keeps its starts in projectBrainSpace', async () => {
    const d = await setup();
    const id = await beginStuck(d);
    await start(d, id);
    await tag(d, id, 'work');
    await setPartEnabled(d, 'work', false);
    const config = await d.config.getConfig();
    expect(config.parts.find((p) => p.id === 'work')?.enabled).toBe(false);
    const space = projectBrainSpace(
      foldAttempts(await d.events.list()),
      config.plans,
      config.parts,
      d.clock.now(),
    );
    expect(space.parts.find((p) => p.partId === 'work')?.starts).toBe(1);
  });
});
