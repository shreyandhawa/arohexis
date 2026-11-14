import { describe, expect, it } from 'vitest';
import { backupNudgeDue } from './useCheckinDue';

const DAY = 86_400_000;
const now = Date.UTC(2026, 10, 20, 15, 0);
const TZ = 'America/New_York';

describe('backupNudgeDue', () => {
  it('counts from the first event when never exported', () => {
    expect(backupNudgeDue(undefined, now - 14 * DAY, now, TZ)).toBe(true);
    expect(backupNudgeDue(undefined, now - 30 * DAY, now, TZ)).toBe(true);
  });
  it('stays quiet when never exported and under 14 days', () => {
    expect(backupNudgeDue(undefined, now - 13 * DAY, now, TZ)).toBe(false);
    expect(backupNudgeDue(undefined, null, now, TZ)).toBe(false);
  });
  it('counts from the last export when there is one', () => {
    expect(backupNudgeDue(now - 2 * DAY, now - 60 * DAY, now, TZ)).toBe(false);
    expect(backupNudgeDue(now - 15 * DAY, now - 60 * DAY, now, TZ)).toBe(true);
  });
});
