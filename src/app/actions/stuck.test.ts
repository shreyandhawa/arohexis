import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { foldAttempts } from '../../domain/attempts';
import { startsThisWeek } from '../../domain/metrics';
import { testDeps } from '../../domain/testing/fixtures';
import { createConfigStore } from '../../storage/configStore';
import type { ArohexisDB } from '../../storage/db';
import { createEventStore } from '../../storage/eventStore';
import { openStorage } from '../../storage/open';
import type { AppDeps } from '../data/DataProvider';
import { beginStuck, chooseFeeling, finishTimer, notNow, start, tag, undo } from './stuck';

const opened: ArohexisDB[] = [];

async function setup(persist = vi.fn().mockResolvedValue(true)) {
  const result = await openStorage(`test-${crypto.randomUUID()}`);
  if (!result.ok) throw result.error;
  opened.push(result.db);
  const { clock, ids } = testDeps();
  const d: AppDeps = {
    db: result.db,
    events: createEventStore(result.db),
    config: createConfigStore(result.db),
    clock,
    ids,
    persist,
  };
  return { d, persist, clock };
}

async function attempts(d: AppDeps) {
  return foldAttempts(await d.events.list());
}

async function weekCount(d: AppDeps) {
  const { settings } = await d.config.getConfig();
  return startsThisWeek(
    await attempts(d),
    d.clock.now(),
    d.clock.timeZone(),
    settings.weekStartsOn,
  );
}

afterEach(async () => {
  for (const db of opened.splice(0)) {
    db.close();
    await db.delete();
  }
});

describe('stuck-flow actions', () => {
  it('full flow records one counted start', async () => {
    const { d } = await setup();
    const id = await beginStuck(d);
    await chooseFeeling(d, id, 'anxious');
    await start(d, id);
    await tag(d, id, 'work');
    await finishTimer(d, id, 'kept-going');
    const [a] = await attempts(d);
    expect(a?.feeling).toBeDefined();
    expect(a?.start).toBeDefined();
    expect(a?.timer).toBeDefined();
    expect(await weekCount(d)).toBe(1);
    expect((await d.events.listByAttempt(id)).map((e) => e.type)).toContain('start.tagged');
  });

  it('double start counts once', async () => {
    const { d } = await setup();
    const id = await beginStuck(d);
    await Promise.all([start(d, id), start(d, id)]);
    expect(await weekCount(d)).toBe(1);
    expect(await d.events.listByType('start.made')).toHaveLength(1);
  });

  it('requests persistent storage once', async () => {
    const { d, persist } = await setup();
    const first = await beginStuck(d);
    const second = await beginStuck(d);
    await start(d, first);
    await start(d, second);
    expect(persist).toHaveBeenCalledTimes(1);
    expect((await d.config.getConfig()).settings.persistRequested).toBe(true);
  });

  it('does not wait for a persist() permission prompt', async () => {
    const { d } = await setup(vi.fn().mockReturnValue(new Promise<boolean>(() => undefined)));
    const id = await beginStuck(d);
    await expect(start(d, id)).resolves.toBeUndefined();
    expect(await weekCount(d)).toBe(1);
  });

  it('a persist rejection does not fail the start but still sets the flag', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { d } = await setup(vi.fn().mockRejectedValue(new Error('denied')));
    const id = await beginStuck(d);
    await expect(start(d, id)).resolves.toBeUndefined();
    expect(await weekCount(d)).toBe(1);
    expect((await d.config.getConfig()).settings.persistRequested).toBe(true);
  });

  it('a start that appends nothing does not request persistence', async () => {
    const { d, persist } = await setup();
    await start(d, 'never-opened');
    expect(persist).not.toHaveBeenCalled();
  });

  it('chooseFeeling uses rotation across attempts', async () => {
    const { d, clock } = await setup();
    for (let i = 0; i < 3; i++) {
      await chooseFeeling(d, await beginStuck(d), 'anxious');
      clock.advance(1000);
    }
    const shown = await d.events.listByType('response.shown');
    expect(shown.map((e) => e.responseId)).toEqual([
      'anxious.name',
      'anxious.shrink',
      'anxious.kind',
    ]);
  });

  it('chooseFeeling and tag reject unknown ids with the id in the message', async () => {
    const { d } = await setup();
    const id = await beginStuck(d);
    await expect(chooseFeeling(d, id, 'nope-feeling')).rejects.toThrow('nope-feeling');
    await start(d, id);
    await expect(tag(d, id, 'nope-task')).rejects.toThrow('nope-task');
  });

  it("tag records the part's label", async () => {
    const { d } = await setup();
    const id = await beginStuck(d);
    await start(d, id);
    await tag(d, id, 'study');
    const [a] = await attempts(d);
    expect(a?.part).toEqual({ id: 'study', label: 'Study' });
  });

  it('tag rejects an unknown part', async () => {
    const { d } = await setup();
    const id = await beginStuck(d);
    await start(d, id);
    await expect(tag(d, id, 'nope-part')).rejects.toThrow('Unknown part: nope-part');
  });

  it('undo reverses the counted start', async () => {
    const { d } = await setup();
    const id = await beginStuck(d);
    await start(d, id);
    await undo(d, id);
    expect(await weekCount(d)).toBe(0);
  });

  it('notNow dismisses an unstarted attempt', async () => {
    const { d } = await setup();
    const id = await beginStuck(d);
    await notNow(d, id);
    expect((await attempts(d))[0]?.dismissed).toBeDefined();
  });

  it('notNow after start does nothing', async () => {
    const { d } = await setup();
    const id = await beginStuck(d);
    await start(d, id);
    await notNow(d, id);
    expect(await d.events.listByType('attempt.dismissed')).toHaveLength(0);
    expect(await weekCount(d)).toBe(1);
  });
});
