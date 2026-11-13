import type { Plan, WeekDay } from './config';
import type { AppEvent } from './events';
import { occurrenceStatus, occurrencesBetween, type Occurrence } from './plans';

export const LAPSE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export type RepairChoice = 'keep' | 'smaller' | 'move' | 'pause';
export type RepairInput = { firstAction?: string; time?: string; days?: readonly WeekDay[] };

/**
 * Spec §6.4. Slipped, unresolved occurrences since the plan's last resume or schedule change
 * (`activeSince`): the most recent in the last 7 days is offered for repair; every other one,
 * including those older than 7 days, is to be recorded as expired by the caller, so there is never a list of lapses.
 */
export function findLapseToRepair(
  plans: readonly Plan[],
  events: readonly AppEvent[],
  now: number,
  tz: string,
): { repair?: { plan: Plan; occurrence: Occurrence }; expire: Occurrence[] } {
  const slipped: { plan: Plan; occurrence: Occurrence }[] = [];
  for (const plan of plans) {
    const since = Math.max(plan.createdAt, plan.activeSince ?? plan.createdAt);
    for (const occurrence of occurrencesBetween(plan, since, now, tz)) {
      if (occurrenceStatus(plan, occurrence, events, now) === 'slipped')
        slipped.push({ plan, occurrence });
    }
  }
  slipped.sort((a, b) => b.occurrence.at - a.occurrence.at);
  const [latest, ...rest] = slipped;
  const expire = rest.map((s) => s.occurrence);
  if (!latest) return { expire };
  if (now - latest.occurrence.at > LAPSE_WINDOW_MS)
    return { expire: [latest.occurrence, ...expire] };
  return { repair: latest, expire };
}

/** The plan fields a repair changes. `keep` and `pause`'s handling of editCount is the store's. */
export function applyRepair(plan: Plan, choice: RepairChoice, input: RepairInput): Partial<Plan> {
  switch (choice) {
    case 'keep':
      return {};
    case 'smaller': {
      const text = input.firstAction?.trim();
      return text ? { firstAction: text } : {};
    }
    case 'move':
      return {
        ...(input.time !== undefined && { time: input.time }),
        ...(input.days !== undefined && input.days.length > 0 && { days: [...input.days] }),
      };
    case 'pause':
      return plan.active ? { active: false } : {};
  }
}
