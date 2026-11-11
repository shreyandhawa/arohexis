import { describe, expect, it } from 'vitest';
import { createEvent } from './events';
import { testDeps } from './testing/fixtures';

describe('createEvent', () => {
  it('stamps id, time, zone and version', () => {
    const d = testDeps();
    expect(createEvent(d, 'start.made', { attemptId: 'a1', backfilled: false })).toEqual({
      id: 'id-1',
      type: 'start.made',
      at: Date.UTC(2026, 10, 16, 14, 0),
      tz: 'America/New_York',
      v: 1,
      attemptId: 'a1',
      backfilled: false,
    });
  });

  it('ids are sequential and clock is injectable', () => {
    const d = testDeps();
    const first = createEvent(d, 'start.undone', { attemptId: 'a1' });
    d.clock.advance(1000);
    const second = createEvent(d, 'start.undone', { attemptId: 'a1' });
    expect(second.id).toBe('id-2');
    expect(second.at - first.at).toBe(1000);
  });
});
