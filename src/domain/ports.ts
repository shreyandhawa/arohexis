import type { Config, ConfigPatch } from './config';
import type { AppEvent, EventOf, EventType } from './events';

export interface Clock {
  now(): number;
  timeZone(): string;
}

export interface IdGen {
  next(): string;
}

export interface EventStore {
  append(events: readonly AppEvent[]): Promise<void>;
  list(range?: { from?: number; to?: number }): Promise<AppEvent[]>;
  listByAttempt(attemptId: string): Promise<AppEvent[]>;
  listByType<T extends EventType>(type: T): Promise<EventOf<T>[]>;
  /** Reads the attempt's events and appends decide()'s result in one read-write transaction. decide must be synchronous. */
  appendForAttempt(
    attemptId: string,
    decide: (attemptEvents: AppEvent[]) => AppEvent[],
  ): Promise<AppEvent[]>;
}

export interface ConfigStore {
  getConfig(): Promise<Config>;
  applyConfigPatch(patch: ConfigPatch): Promise<void>;
}
