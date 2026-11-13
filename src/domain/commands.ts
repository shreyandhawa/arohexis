import { findAttempt, isCountedStart } from './attempts';
import type { Feeling, FeelingResponse, Part, Plan, PlanPatch } from './config';
import { applyRepair, type RepairChoice, type RepairInput } from './lapse';
import { createEvent } from './events';
import type { AppEvent, AttemptOpened, EventDeps, ResponseShown } from './events';
import { pickResponse } from './matcher';

export function openAttempt(
  deps: EventDeps,
  input: { source: 'stuck' } | { source: 'plan'; planId: string; occurrence?: string },
): AttemptOpened {
  return createEvent(deps, 'attempt.opened', {
    attemptId: deps.ids.next(),
    ...input,
  });
}

export function nameFeeling(
  deps: EventDeps,
  attemptEvents: readonly AppEvent[],
  attemptId: string,
  feeling: Feeling,
  responses: readonly FeelingResponse[],
  shown: readonly ResponseShown[],
): AppEvent[] {
  const a = findAttempt(attemptEvents, attemptId);
  if (!a || a.feeling) return [];
  const response = pickResponse(feeling.id, responses, shown);
  const named = createEvent(deps, 'feeling.named', {
    attemptId,
    feelingId: feeling.id,
    label: feeling.label,
  });
  const shownEvent = createEvent(deps, 'response.shown', {
    attemptId,
    feelingId: feeling.id,
    responseId: response.id,
    basis: response.basis,
  });
  return [named, shownEvent];
}

export function makeStart(
  deps: EventDeps,
  attemptEvents: readonly AppEvent[],
  attemptId: string,
  link?: { planId: string; occurrence?: string; backfilled: boolean },
): AppEvent[] {
  const a = findAttempt(attemptEvents, attemptId);
  if (!a || a.start || a.dismissed) return [];
  return [
    createEvent(
      deps,
      'start.made',
      link
        ? {
            attemptId,
            planId: link.planId,
            ...(link.occurrence !== undefined && { occurrence: link.occurrence }),
            backfilled: link.backfilled,
          }
        : { attemptId, backfilled: false },
    ),
  ];
}

export function undoStart(
  deps: EventDeps,
  attemptEvents: readonly AppEvent[],
  attemptId: string,
): AppEvent[] {
  const a = findAttempt(attemptEvents, attemptId);
  if (!a || !isCountedStart(a)) return [];
  return [createEvent(deps, 'start.undone', { attemptId })];
}

export function tagStart(
  deps: EventDeps,
  attemptEvents: readonly AppEvent[],
  attemptId: string,
  part: Pick<Part, 'id' | 'label'>,
): AppEvent[] {
  const a = findAttempt(attemptEvents, attemptId);
  if (!a || !isCountedStart(a)) return [];
  return [
    createEvent(deps, 'start.tagged', {
      attemptId,
      taskTypeId: part.id,
      label: part.label,
    }),
  ];
}

export function closeTimer(
  deps: EventDeps,
  attemptEvents: readonly AppEvent[],
  attemptId: string,
  outcome: 'kept-going' | 'stopped',
): AppEvent[] {
  const a = findAttempt(attemptEvents, attemptId);
  if (!a?.start || !isCountedStart(a) || a.timer) return [];
  const elapsedSec = Math.max(0, Math.floor((deps.clock.now() - a.start.at) / 1000));
  return [createEvent(deps, 'timer.closed', { attemptId, elapsedSec, outcome })];
}

export function dismissAttempt(
  deps: EventDeps,
  attemptEvents: readonly AppEvent[],
  attemptId: string,
): AppEvent[] {
  const a = findAttempt(attemptEvents, attemptId);
  if (!a || a.start || a.dismissed) return [];
  return [createEvent(deps, 'attempt.dismissed', { attemptId })];
}

/**
 * A start made from a plan: attempt.opened, start.made and, when the plan has an enabled-or-not
 * part, start.tagged, for one transaction. Without an occurrence it is a plan-linked start that
 * is not on cue ("Two minutes now?").
 */
export function startFromPlan(
  deps: EventDeps,
  plan: Pick<Plan, 'id' | 'partId'>,
  parts: readonly Part[],
  occurrence?: string,
  backfilled = false,
): AppEvent[] {
  const opened = openAttempt(deps, {
    source: 'plan',
    planId: plan.id,
    ...(occurrence !== undefined && { occurrence }),
  });
  const start = makeStart(deps, [opened], opened.attemptId, {
    planId: plan.id,
    ...(occurrence !== undefined && { occurrence }),
    backfilled,
  });
  const part = plan.partId === undefined ? undefined : parts.find((p) => p.id === plan.partId);
  const events: AppEvent[] = [opened, ...start];
  if (part) events.push(...tagStart(deps, events, opened.attemptId, part));
  return events;
}

export function resolveOccurrence(
  deps: EventDeps,
  planId: string,
  occurrence: string,
  outcome: 'slipped' | 'expired',
) {
  return createEvent(deps, 'occurrence.resolved', { planId, occurrence, outcome });
}

/** Spec §8.7 step 4: lapse.repaired, a backfilled start if started anyway, and the plan change. */
export function repairLapse(
  deps: EventDeps,
  plan: Plan,
  occurrence: string,
  parts: readonly Part[],
  input: RepairInput & {
    startedAnyway: boolean;
    obstacle?: { id: string; label: string };
    choice: RepairChoice;
  },
): { events: AppEvent[]; plans: PlanPatch } {
  const events: AppEvent[] = [
    createEvent(deps, 'lapse.repaired', {
      planId: plan.id,
      occurrence,
      startedAnyway: input.startedAnyway,
      ...(input.obstacle && { obstacleId: input.obstacle.id, obstacleLabel: input.obstacle.label }),
      choice: input.choice,
    }),
  ];
  if (input.startedAnyway) events.push(...startFromPlan(deps, plan, parts, occurrence, true));
  const changes = applyRepair(plan, input.choice, input);
  if (input.choice === 'pause')
    return { events, plans: changes.active === false ? { pause: [plan.id] } : {} };
  return {
    events,
    plans: Object.keys(changes).length > 0 ? { update: [{ ...plan, ...changes }] } : {},
  };
}
