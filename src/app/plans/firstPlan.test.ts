import { describe, expect, it } from 'vitest';
import type { Config } from '../../domain/config';
import { hourAsTime, peakHour, planNudgeShown, readPlanEditorState } from './firstPlan';

const config = (plans: number, dismissed?: boolean) =>
  ({
    plans: Array.from({ length: plans }),
    settings: { ...(dismissed !== undefined && { planNudgeDismissed: dismissed }) },
  }) as unknown as Config;

describe('readPlanEditorState', () => {
  it('reads only what it knows', () => {
    expect(readPlanEditorState(null)).toEqual({ firstRun: false });
    expect(readPlanEditorState({ firstRun: 'yes', time: 9 })).toEqual({ firstRun: false });
    expect(readPlanEditorState({ firstRun: true })).toEqual({ firstRun: true });
    expect(readPlanEditorState({ time: '21:00' })).toEqual({ firstRun: false, time: '21:00' });
    expect(readPlanEditorState({ time: '25:00' })).toEqual({ firstRun: false });
  });
});

describe('hourAsTime', () => {
  it('pads to HH:MM', () => {
    expect(hourAsTime(9)).toBe('09:00');
    expect(hourAsTime(21)).toBe('21:00');
  });
});

describe('peakHour', () => {
  const at = (h: number, n: number) => Array.from({ length: 24 }, (_, i) => (i === h ? n : 0));
  it('needs enough starts', () => {
    expect(peakHour(at(21, 4))).toBeUndefined();
    expect(peakHour(at(21, 5))).toBe(21);
    expect(peakHour(at(0, 5))).toBe(0);
  });
});

describe('planNudgeShown', () => {
  it('shows for the owner with no plans, until dismissed', () => {
    expect(planNudgeShown('main', config(0))).toBe(true);
    expect(planNudgeShown('main', config(0, true))).toBe(false);
    expect(planNudgeShown('main', config(1))).toBe(false);
    expect(planNudgeShown('demo', config(0))).toBe(false);
  });
});
