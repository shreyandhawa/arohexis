import { describe, expect, it } from 'vitest';
import type { AppEvent } from '../../domain/events';
import type { AppDeps } from '../data/DataProvider';
import { submitCheckin } from './checkin';

describe('submitCheckin', () => {
  it('falls back to the default check-in day when none is set', async () => {
    const appended: AppEvent[] = [];
    // Wednesday 2026-11-18, so a Sunday-start week began 2026-11-15.
    const now = Date.UTC(2026, 10, 18, 15, 0);
    const d = {
      clock: { now: () => now, timeZone: () => 'America/New_York' },
      ids: { next: () => 'id1' },
      config: { getConfig: async () => ({ settings: {} }) },
      events: {
        append: async (events: readonly AppEvent[]) => {
          appended.push(...events);
        },
      },
    } as unknown as AppDeps;
    await submitCheckin(d, [4, 4, 4, 4] as never);
    expect(appended).toHaveLength(1);
    expect(appended[0]).toMatchObject({ type: 'checkin.submitted', weekOf: '2026-11-15' });
  });
});
