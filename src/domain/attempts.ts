import type { AppEvent, Basis } from './events';

export type Attempt = {
  id: string;
  openedAt: number;
  tz: string;
  source: 'stuck' | 'plan';
  planId?: string;
  occurrence?: string;
  feeling?: { id: string; label: string };
  response?: { id: string; basis: Basis };
  start?: { at: number; tz: string; backfilled: boolean };
  undone: boolean;
  taskType?: { id: string; label: string };
  timer?: { elapsedSec: number; outcome: 'kept-going' | 'stopped' };
  dismissed: boolean;
};

/**
 * Folds events into attempts, ordered by openedAt ascending. An attempt exists
 * only once opened; events for attempts that are never opened are ignored. The
 * first start.made wins and start.undone is sticky.
 *
 * Opening is order-independent: pass 1 registers every attempt.opened, pass 2
 * applies the other events in `at` order. Events can share an `at` (one tap
 * emits several) and storage breaks such ties by random id, so an attempt's
 * events may arrive with start.made ahead of attempt.opened.
 */
export function foldAttempts(events: readonly AppEvent[]): Attempt[] {
  const byId = new Map<string, Attempt>();
  for (const e of events) {
    if (e.type !== 'attempt.opened' || byId.has(e.attemptId)) continue;
    byId.set(e.attemptId, {
      id: e.attemptId,
      openedAt: e.at,
      tz: e.tz,
      source: e.source,
      ...(e.planId !== undefined && { planId: e.planId }),
      ...(e.occurrence !== undefined && { occurrence: e.occurrence }),
      undone: false,
      dismissed: false,
    });
  }
  const rest = events.filter((e) => e.type !== 'attempt.opened');
  // Array.prototype.sort is stable, so equal-`at` events keep their input order.
  rest.sort((x, y) => x.at - y.at);
  for (const e of rest) {
    if (!('attemptId' in e)) continue;
    const a = byId.get(e.attemptId);
    if (!a) continue;
    switch (e.type) {
      case 'feeling.named':
        a.feeling = { id: e.feelingId, label: e.label };
        break;
      case 'response.shown':
        a.response = { id: e.responseId, basis: e.basis };
        break;
      case 'start.made':
        a.start ??= { at: e.at, tz: e.tz, backfilled: e.backfilled };
        break;
      case 'start.undone':
        a.undone = true;
        break;
      case 'start.tagged':
        a.taskType = { id: e.taskTypeId, label: e.label };
        break;
      case 'timer.closed':
        a.timer = { elapsedSec: e.elapsedSec, outcome: e.outcome };
        break;
      case 'attempt.dismissed':
        a.dismissed = true;
        break;
      default: {
        const unhandled: never = e;
        throw new Error(`Unhandled event: ${JSON.stringify(unhandled)}`);
      }
    }
  }
  return [...byId.values()].sort((x, y) => x.openedAt - y.openedAt);
}

export function findAttempt(events: readonly AppEvent[], attemptId: string): Attempt | undefined {
  return foldAttempts(events).find((a) => a.id === attemptId);
}

export function isCountedStart(a: Attempt): boolean {
  return a.start !== undefined && !a.undone;
}
