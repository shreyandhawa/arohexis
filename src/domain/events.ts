import type { Clock, IdGen } from './ports';

export const EVENT_SCHEMA_VERSION = 1;

export type Basis =
  'name-the-feeling' | 'shrink-the-step' | 'self-kindness' | 'reframe' | 'pair-a-reward';

type Envelope<T extends string> = { id: string; type: T; at: number; tz: string; v: 1 };

export type AttemptOpened = Envelope<'attempt.opened'> & {
  attemptId: string;
  source: 'stuck' | 'plan';
  planId?: string;
  occurrence?: string;
};
export type FeelingNamed = Envelope<'feeling.named'> & {
  attemptId: string;
  feelingId: string;
  label: string;
};
export type ResponseShown = Envelope<'response.shown'> & {
  attemptId: string;
  feelingId: string;
  responseId: string;
  basis: Basis;
};
export type StartMade = Envelope<'start.made'> & {
  attemptId: string;
  planId?: string;
  occurrence?: string;
  backfilled: boolean;
};
export type StartUndone = Envelope<'start.undone'> & { attemptId: string };
export type StartTagged = Envelope<'start.tagged'> & {
  attemptId: string;
  taskTypeId: string;
  label: string;
};
export type TimerClosed = Envelope<'timer.closed'> & {
  attemptId: string;
  elapsedSec: number;
  outcome: 'kept-going' | 'stopped';
};
export type AttemptDismissed = Envelope<'attempt.dismissed'> & { attemptId: string };
export type OccurrenceResolved = Envelope<'occurrence.resolved'> & {
  planId: string;
  occurrence: string;
  outcome: 'slipped' | 'expired';
};
export type LapseRepaired = Envelope<'lapse.repaired'> & {
  planId: string;
  occurrence: string;
  startedAnyway: boolean;
  obstacleId?: string;
  obstacleLabel?: string;
  choice: 'keep' | 'smaller' | 'move' | 'pause';
};
export type CheckinSubmitted = Envelope<'checkin.submitted'> & {
  weekOf: string;
  answers: [number, number, number, number];
};

export type AppEvent =
  | AttemptOpened
  | FeelingNamed
  | ResponseShown
  | StartMade
  | StartUndone
  | StartTagged
  | TimerClosed
  | AttemptDismissed
  | OccurrenceResolved
  | LapseRepaired
  | CheckinSubmitted;

export type EventType = AppEvent['type'];
export type EventOf<T extends EventType> = Extract<AppEvent, { type: T }>;
export type PayloadOf<T extends EventType> = Omit<EventOf<T>, 'id' | 'type' | 'at' | 'tz' | 'v'>;
export type EventDeps = { clock: Clock; ids: IdGen };

export function createEvent<T extends EventType>(
  deps: EventDeps,
  type: T,
  payload: PayloadOf<T>,
): EventOf<T> {
  return {
    ...payload,
    id: deps.ids.next(),
    type,
    at: deps.clock.now(),
    tz: deps.clock.timeZone(),
    v: EVENT_SCHEMA_VERSION,
  } as EventOf<T>;
}
