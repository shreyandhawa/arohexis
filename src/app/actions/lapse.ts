import type { Part, Plan } from '../../domain/config';
import { repairLapse, resolveOccurrence, startFromPlan } from '../../domain/commands';
import type { RepairChoice, RepairInput } from '../../domain/lapse';
import type { EventDeps } from '../../domain/events';
import type { Occurrence } from '../../domain/plans';
import type { AppDeps } from '../data/DataProvider';
import { afterFirstStart } from './stuck';

function eventDeps(d: AppDeps): EventDeps {
  return { clock: d.clock, ids: d.ids };
}

/** Occurrences nobody will be asked about (spec §6.4). */
export async function expireOccurrences(d: AppDeps, list: readonly Occurrence[]): Promise<void> {
  if (list.length === 0) return;
  const deps = eventDeps(d);
  await d.events.appendResolutions(
    list.map((o) => resolveOccurrence(deps, o.planId, o.date, 'expired')),
  );
}

/** Closing the repair sheet unfinished: it does not come back for this occurrence. */
export async function slipOccurrence(d: AppDeps, planId: string, date: string): Promise<void> {
  await d.events.appendResolutions([resolveOccurrence(eventDeps(d), planId, date, 'slipped')]);
}

export async function finishRepair(
  d: AppDeps,
  plan: Plan,
  date: string,
  input: RepairInput & {
    startedAnyway: boolean;
    obstacle?: { id: string; label: string };
    choice: RepairChoice;
  },
): Promise<void> {
  const { parts } = await d.config.getConfig();
  const { events, plans } = repairLapse(eventDeps(d), plan, date, parts, input);
  await d.events.append(events);
  if (plans.update?.length || plans.pause?.length) await d.config.applyConfigPatch({ plans });
  if (input.startedAnyway) await afterFirstStart(d);
}

/** A plan-linked start: on cue with an occurrence, or "Two minutes now?" without one. Returns the attempt. */
export async function startPlan(
  d: AppDeps,
  plan: Plan,
  parts: readonly Part[],
  occurrence?: string,
): Promise<string> {
  const events = startFromPlan(eventDeps(d), plan, parts, occurrence);
  await d.events.append(events);
  await afterFirstStart(d);
  const first = events[0];
  if (first?.type !== 'attempt.opened') throw new Error('Plan start has no attempt');
  return first.attemptId;
}
