import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
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
});
