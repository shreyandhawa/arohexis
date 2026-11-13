import type { BrainLine } from './brainSpace';
import type { Plan } from './config';
import type { AppEvent } from './events';

type PlanLine = Extract<BrainLine, { kind: 'plan' }>;

/** Spec §16.9, rows 1 to 5. */
export type FocusRule = 'lapse' | 'waiting' | 'stable-cue' | 'add-plan' | 'name-feeling';

const LAPSE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Plans with a slip or a repaired lapse in the last 7 days. */
export function recentLapses(events: readonly AppEvent[], now: number): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const e of events) {
    const lapse =
      e.type === 'lapse.repaired' || (e.type === 'occurrence.resolved' && e.outcome === 'slipped');
    if (lapse && now - e.at <= LAPSE_WINDOW_MS) ids.add(e.planId);
  }
  return ids;
}

/** The first rule that matches wins. */
export function focusFor(input: {
  partId: string;
  plans: readonly Plan[];
  lines: readonly BrainLine[];
  lapsedPlanIds: ReadonlySet<string>;
  plansAvailable: boolean;
}): FocusRule {
  const plans = input.plans.filter((p) => p.partId === input.partId);
  const lines = input.lines.filter(
    (l): l is PlanLine => l.kind === 'plan' && l.partId === input.partId,
  );
  if (plans.some((p) => input.lapsedPlanIds.has(p.id))) return 'lapse';
  if (lines.some((l) => l.strength === 'waiting' && !l.hidden)) {
    return 'waiting';
  }
  if (lines.some((l) => l.strength !== 'waiting' && l.strength >= 2)) {
    return 'stable-cue';
  }
  if (input.plansAvailable && plans.length === 0) return 'add-plan';
  return 'name-feeling';
}
