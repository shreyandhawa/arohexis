import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from './config';

describe('DEFAULT_SETTINGS', () => {
  it('has exactly the documented defaults', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      theme: 'system',
      weekStartsOn: 1,
      checkinDay: 0,
      persistRequested: false,
      onboarded: false,
    });
  });
});
