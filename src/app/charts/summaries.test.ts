import { describe, expect, it } from 'vitest';
import { checkCopy } from '../../copy/rules';
import { barsSummary, hoursSummary, lineSummary, weeksSummary } from './summaries';

describe('chart summaries', () => {
  it('each is one sentence that passes the copy rules', () => {
    const out = [
      weeksSummary([
        { weekOf: '2026-11-01', count: 0 },
        { weekOf: '2026-11-08', count: 3 },
      ]),
      hoursSummary([...new Array<number>(9).fill(0), 4, ...new Array<number>(14).fill(0)]),
      barsSummary([
        { id: 'a', label: 'Tired', count: 2 },
        { id: 'b', label: 'Bored', count: 5 },
      ]),
      lineSummary([{ weekOf: '2026-11-08', score: 4.25 }]),
    ];
    expect(out[0]).toBe('3 starts over 2 weeks, 3 this week.');
    expect(out[1]).toBe('4 starts in all, most often around 9 AM.');
    expect(out[2]).toBe('7 starts in all, most from Bored (5).');
    expect(out[3]).toBe('1 weekly check-in, the latest averaging 4.3 out of 7.');
    for (const s of out) expect(checkCopy(s)).toEqual([]);
  });

  it('handles no data', () => {
    expect(hoursSummary(new Array<number>(24).fill(0))).toBe('No starts yet.');
    expect(barsSummary([])).toBe('No starts yet.');
    expect(lineSummary([])).toBe('No check-ins yet.');
  });
});
