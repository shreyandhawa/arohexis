import { findAttempt, isCountedStart } from './attempts';
import type { Feeling, FeelingResponse, Part } from './config';
import { createEvent } from './events';
import type { AppEvent, AttemptOpened, EventDeps, ResponseShown } from './events';
import { pickResponse } from './matcher';

export function openAttempt(
  deps: EventDeps,
  input: { source: 'stuck' } | { source: 'plan'; planId: string; occurrence: string },
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
  link?: { planId: string; occurrence: string; backfilled: boolean },
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
            occurrence: link.occurrence,
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
