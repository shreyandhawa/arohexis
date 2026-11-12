import { describe, expect, it } from 'vitest';
import { findAttempt } from './attempts';
import {
  closeTimer,
  dismissAttempt,
  makeStart,
  nameFeeling,
  openAttempt,
  tagStart,
  undoStart,
} from './commands';
import type { Feeling, FeelingResponse, Part } from './config';
import type { AppEvent, ResponseShown } from './events';
import { testDeps } from './testing/fixtures';

const feeling: Feeling = { id: 'f1', label: 'Anxious', order: 1, enabled: true, builtIn: true };
const resp = (id: string, order: number): FeelingResponse => ({
  id,
  feelingId: 'f1',
  body: id,
  basis: 'reframe',
  enabled: true,
  order,
  builtIn: true,
});
const responses = [resp('r1', 1), resp('r2', 2)];
const part: Pick<Part, 'id' | 'label'> = { id: 't1', label: 'Email' };

function setup() {
  const deps = testDeps();
  const opened = openAttempt(deps, { source: 'stuck' });
  const events: AppEvent[] = [opened];
  return { deps, events, id: opened.attemptId };
}

describe('openAttempt', () => {
  it('opens a stuck attempt without plan keys', () => {
    const e = openAttempt(testDeps(), { source: 'stuck' });
    expect(e.type).toBe('attempt.opened');
    expect(e.source).toBe('stuck');
    expect('planId' in e).toBe(false);
  });
  it('opens a plan attempt', () => {
    const e = openAttempt(testDeps(), { source: 'plan', planId: 'p', occurrence: '2026-11-16' });
    expect(e).toMatchObject({ source: 'plan', planId: 'p', occurrence: '2026-11-16' });
  });
});

describe('nameFeeling', () => {
  it("snapshots the label and the matcher's pick", () => {
    const { deps, events, id } = setup();
    const out = nameFeeling(deps, events, id, feeling, responses, []);
    expect(out.map((e) => e.type)).toEqual(['feeling.named', 'response.shown']);
    expect(out[0]).toMatchObject({ feelingId: 'f1', label: 'Anxious' });
    expect(out[1]).toMatchObject({ responseId: 'r1', basis: 'reframe', feelingId: 'f1' });
  });
  it('is a no-op the second time', () => {
    const { deps, events, id } = setup();
    events.push(...nameFeeling(deps, events, id, feeling, responses, []));
    expect(nameFeeling(deps, events, id, feeling, responses, [])).toEqual([]);
  });
  it('is a no-op for an unopened attempt', () => {
    const { deps } = setup();
    expect(nameFeeling(deps, [], 'nope', feeling, responses, [] as ResponseShown[])).toEqual([]);
  });
});

describe('makeStart', () => {
  it('is idempotent', () => {
    const { deps, events, id } = setup();
    const first = makeStart(deps, events, id);
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({ backfilled: false });
    expect('planId' in first[0]!).toBe(false);
    events.push(...first);
    expect(makeStart(deps, events, id)).toEqual([]);
  });
  it('links a plan occurrence', () => {
    const { deps, events, id } = setup();
    const [e] = makeStart(deps, events, id, { planId: 'p', occurrence: 'o', backfilled: true });
    expect(e).toMatchObject({ planId: 'p', occurrence: 'o', backfilled: true });
  });
  it('is a no-op after undo, after dismissal and for unopened attempts', () => {
    const { deps, events, id } = setup();
    expect(makeStart(deps, [], id)).toEqual([]);
    const dismissed = [...events, ...dismissAttempt(deps, events, id)];
    expect(makeStart(deps, dismissed, id)).toEqual([]);
    const started = [...events, ...makeStart(deps, events, id)];
    const undone = [...started, ...undoStart(deps, started, id)];
    expect(makeStart(deps, undone, id)).toEqual([]);
  });
});

describe('undoStart', () => {
  it('only undoes a counted start', () => {
    const { deps, events, id } = setup();
    expect(undoStart(deps, events, id)).toEqual([]);
    events.push(...makeStart(deps, events, id));
    const out = undoStart(deps, events, id);
    expect(out.map((e) => e.type)).toEqual(['start.undone']);
    events.push(...out);
    expect(undoStart(deps, events, id)).toEqual([]);
    expect(findAttempt(events, id)?.undone).toBe(true);
  });
});

describe('tagStart', () => {
  it("snapshots the part's label and needs a counted start", () => {
    const { deps, events, id } = setup();
    expect(tagStart(deps, events, id, part)).toEqual([]);
    events.push(...makeStart(deps, events, id));
    const [e] = tagStart(deps, events, id, part);
    expect(e).toMatchObject({ type: 'start.tagged', taskTypeId: 't1', label: 'Email' });
  });
});

describe('closeTimer', () => {
  it('records elapsed seconds once', () => {
    const { deps, events, id } = setup();
    expect(closeTimer(deps, events, id, 'stopped')).toEqual([]);
    events.push(...makeStart(deps, events, id));
    deps.clock.advance(125_900);
    const out = closeTimer(deps, events, id, 'kept-going');
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ type: 'timer.closed', elapsedSec: 125, outcome: 'kept-going' });
    events.push(...out);
    expect(closeTimer(deps, events, id, 'stopped')).toEqual([]);
  });
});

describe('dismissAttempt', () => {
  it('refuses after a start, including an undone one', () => {
    const { deps, events, id } = setup();
    const started = [...events, ...makeStart(deps, events, id)];
    expect(dismissAttempt(deps, started, id)).toEqual([]);
    const undone = [...started, ...undoStart(deps, started, id)];
    expect(dismissAttempt(deps, undone, id)).toEqual([]);
  });
  it('dismisses once', () => {
    const { deps, events, id } = setup();
    expect(dismissAttempt(deps, [], id)).toEqual([]);
    const out = dismissAttempt(deps, events, id);
    expect(out.map((e) => e.type)).toEqual(['attempt.dismissed']);
    expect(dismissAttempt(deps, [...events, ...out], id)).toEqual([]);
  });
});
