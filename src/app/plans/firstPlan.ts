import { EARLY_DAYS_BELOW } from '../../domain/metrics';
import type { Config } from '../../domain/config';

export type PlanEditorState = { firstRun: boolean; time?: string };

/** What a link to the new-plan editor carries in router state, if it is one we know. */
export function readPlanEditorState(state: unknown): PlanEditorState {
  if (typeof state !== 'object' || state === null) return { firstRun: false };
  const { firstRun, time } = state as { firstRun?: unknown; time?: unknown };
  return {
    firstRun: firstRun === true,
    ...(typeof time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(time) && { time }),
  };
}

/** The top of an hour as the editor's "HH:MM". */
export function hourAsTime(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

/** The most common starting hour, once there are enough starts to call it that. */
export function peakHour(hours: readonly number[]): number | undefined {
  const total = hours.reduce((n, c) => n + c, 0);
  const max = Math.max(...hours);
  return total >= EARLY_DAYS_BELOW && max > 0 ? hours.indexOf(max) : undefined;
}

/** Home's make-a-plan card: the owner's own record, no plans yet, not dismissed. */
export function planNudgeShown(mode: 'main' | 'demo', config: Config): boolean {
  return (
    mode === 'main' && config.plans.length === 0 && config.settings.planNudgeDismissed !== true
  );
}
