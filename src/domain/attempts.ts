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
 * only once opened; events for unopened attempts are ignored. The first
 * start.made wins and start.undone is sticky.
 */
export function foldAttempts(events: readonly AppEvent[]): Attempt[] {
  const byId = new Map<string, Attempt>();
  for (const e of events) {
    if (e.type === 'attempt.opened') {
      if (byId.has(e.attemptId)) continue;
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
      continue;
    }
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
