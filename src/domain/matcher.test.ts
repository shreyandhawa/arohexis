import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Attempt } from './attempts';
import type { FeelingResponse } from './config';
import { DEFAULT_RESPONSES, GENERIC_RESPONSE_ID } from './defaults';
import type { ResponseShown } from './events';
import { pickResponse } from './matcher';

const shownEvent = (responseId: string, at: number, feelingId = 'anxious'): ResponseShown => ({
  id: `e-${responseId}-${at}`,
  type: 'response.shown',
  at,
  tz: 'UTC',
  v: 1,
  attemptId: 'a1',
  feelingId,
  responseId,
  basis: 'name-the-feeling',
});

describe('pickResponse', () => {
  it('shows a never-shown response first, lowest order', () => {
    expect(pickResponse('anxious', DEFAULT_RESPONSES, []).id).toBe('anxious.name');
  });

  it('shows the least recently shown', () => {
    const two = [shownEvent('anxious.name', 1), shownEvent('anxious.shrink', 2)];
    expect(pickResponse('anxious', DEFAULT_RESPONSES, two).id).toBe('anxious.kind');
    const three = [...two, shownEvent('anxious.kind', 3)];
    expect(pickResponse('anxious', DEFAULT_RESPONSES, three).id).toBe('anxious.name');
  });

  it('uses the latest show per response, regardless of event order', () => {
    const events = [
      shownEvent('anxious.name', 10),
      shownEvent('anxious.name', 1),
      shownEvent('anxious.shrink', 5),
      shownEvent('anxious.kind', 6),
    ];
    expect(pickResponse('anxious', DEFAULT_RESPONSES, events).id).toBe('anxious.shrink');
  });

  it('breaks ties by lowest order', () => {
    const events = [shownEvent('anxious.shrink', 5), shownEvent('anxious.kind', 5)];
    const responses = DEFAULT_RESPONSES.filter((r) => r.id !== 'anxious.name');
    expect(pickResponse('anxious', responses, events).id).toBe('anxious.shrink');
  });

  it('skips disabled responses', () => {
    const responses = DEFAULT_RESPONSES.map((r) =>
      r.id === 'anxious.name' ? { ...r, enabled: false } : r,
    );
    expect(pickResponse('anxious', responses, []).id).toBe('anxious.shrink');
  });

  it('falls back to generic.any when a feeling has none enabled', () => {
    const responses = DEFAULT_RESPONSES.map((r) =>
      r.feelingId === 'anxious' ? { ...r, enabled: false } : r,
    );
    expect(pickResponse('anxious', responses, []).id).toBe(GENERIC_RESPONSE_ID);
  });

  it('falls back to generic.any for an unknown feeling', () => {
    expect(pickResponse('nope', DEFAULT_RESPONSES, []).id).toBe(GENERIC_RESPONSE_ID);
  });

  it('returns generic.any even when it is disabled', () => {
    const responses = DEFAULT_RESPONSES.map((r) =>
      r.id === GENERIC_RESPONSE_ID ? { ...r, enabled: false } : r,
    );
    expect(pickResponse('other', responses, []).id).toBe(GENERIC_RESPONSE_ID);
  });

  it('other always gets generic.any', () => {
    expect(pickResponse('other', DEFAULT_RESPONSES, []).id).toBe(GENERIC_RESPONSE_ID);
  });

  it('throws naming the missing id when generic.any is absent', () => {
    const responses: FeelingResponse[] = DEFAULT_RESPONSES.filter(
      (r) => r.id !== GENERIC_RESPONSE_ID,
    );
    expect(() => pickResponse('other', responses, [])).toThrow(GENERIC_RESPONSE_ID);
  });

  it('k consecutive picks show each enabled response once', () => {
    const anxious = DEFAULT_RESPONSES.filter((r) => r.feelingId === 'anxious');
    fc.assert(
      fc.property(
        fc.subarray(anxious, { minLength: 1 }).chain((subset) => fc.constant(subset)),
        (subset) => {
          const ids = new Set(subset.map((r) => r.id));
          const responses = DEFAULT_RESPONSES.map((r) =>
            r.feelingId === 'anxious' && !ids.has(r.id) ? { ...r, enabled: false } : r,
          );
          const history: ResponseShown[] = [];
          const picked: string[] = [];
          for (let i = 0; i < subset.length; i++) {
            const pick = pickResponse('anxious', responses, history);
            picked.push(pick.id);
            history.push(shownEvent(pick.id, i + 1));
          }
          expect(new Set(picked).size).toBe(subset.length);
        },
      ),
    );
  });

  describe('learning from starts', () => {
    const ids = ['anxious.name', 'anxious.shrink', 'anxious.kind'];
    const attempt = (responseId: string, started: boolean, n: number): Attempt => ({
      id: `${responseId}-${n}`,
      openedAt: n,
      tz: 'UTC',
      source: 'stuck',
      feeling: { id: 'anxious', label: 'Anxious' },
      response: { id: responseId, basis: 'name-the-feeling' },
      ...(started && { start: { at: n, tz: 'UTC', backfilled: false } }),
      undone: false,
      tags: [],
      dismissed: !started,
    });
    /** `count` shows of each response, in rotation; led[id] of them led to a start. */
    function history(count: number, led: Record<string, number>) {
      const shown: ResponseShown[] = [];
      const attempts: Attempt[] = [];
      let t = 0;
      for (let i = 0; i < count; i++) {
        for (const id of ids) {
          t++;
          shown.push(shownEvent(id, t));
          attempts.push(attempt(id, i < (led[id] ?? 0), t));
        }
      }
      return { shown, attempts };
    }

    it('below the threshold, keeps the least recently shown rotation', () => {
      const { shown, attempts } = history(4, { 'anxious.kind': 4 });
      // 12 shown: 12 % 3 === 0 would be a best-rate pick if the threshold were met.
      expect(pickResponse('anxious', DEFAULT_RESPONSES, shown, attempts).id).toBe('anxious.name');
    });

    it('one response under the threshold keeps the rotation', () => {
      const { shown, attempts } = history(5, { 'anxious.kind': 5 });
      const fewer = attempts.filter((a) => !(a.response?.id === 'anxious.name' && a.openedAt < 4));
      expect(pickResponse('anxious', DEFAULT_RESPONSES, shown, fewer).id).toBe('anxious.name');
    });

    it('at the threshold, two picks in three take the best rate', () => {
      const { shown, attempts } = history(5, { 'anxious.shrink': 4, 'anxious.name': 1 });
      const picks = [0, 1, 2, 3, 4, 5].map((k) => {
        const extra = Array.from({ length: k }, (_, i) => shownEvent('anxious.kind', 100 + i));
        return pickResponse('anxious', DEFAULT_RESPONSES, [...shown, ...extra], attempts).id;
      });
      // 15 and 16 shown pick the best; at 17 (17 % 3 === 2) the oldest, name, comes round.
      expect(picks.slice(0, 3)).toEqual(['anxious.shrink', 'anxious.shrink', 'anxious.name']);
    });

    it('ties on rate go to the least recently shown, then lowest order', () => {
      const { shown, attempts } = history(5, {});
      expect(pickResponse('anxious', DEFAULT_RESPONSES, shown, attempts).id).toBe('anxious.name');
      const tied = history(5, { 'anxious.name': 2, 'anxious.shrink': 2, 'anxious.kind': 2 });
      const older = tied.shown.map((e) =>
        e.responseId === 'anxious.kind' ? { ...e, at: e.at - 100 } : e,
      );
      expect(pickResponse('anxious', DEFAULT_RESPONSES, older, tied.attempts).id).toBe(
        'anxious.kind',
      );
    });

    it('always returns an enabled response for the feeling when one exists', () => {
      fc.assert(
        fc.property(
          fc.subarray(ids, { minLength: 1 }),
          fc.array(
            fc.record({
              id: fc.constantFrom(...ids),
              started: fc.boolean(),
              at: fc.integer({ min: 0, max: 50 }),
            }),
            { maxLength: 60 },
          ),
          (enabled, rows) => {
            const responses = DEFAULT_RESPONSES.map((r) =>
              r.feelingId === 'anxious' && !enabled.includes(r.id) ? { ...r, enabled: false } : r,
            );
            const shown = rows.map((x) => shownEvent(x.id, x.at));
            const attempts = rows.map((x, i) => attempt(x.id, x.started, i));
            const pick = pickResponse('anxious', responses, shown, attempts);
            expect(enabled).toContain(pick.id);
          },
        ),
      );
    });
  });
});
