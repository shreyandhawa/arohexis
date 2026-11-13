import { describe, expect, it } from 'vitest';
import { homeNotices } from '../../copy/stuck';
import { readNotice } from '../notice';

describe('a missing attempt', () => {
  it('leaves a short, calm notice for Home', () => {
    expect(readNotice({ notice: 'start-gone' })).toBe('start-gone');
    expect(homeNotices['start-gone'].split(' ').length).toBeLessThan(8);
  });
});
