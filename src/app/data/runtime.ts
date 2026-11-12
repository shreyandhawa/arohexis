import type { Clock, IdGen } from '../../domain/ports';

export const browserClock: Clock = {
  now: () => Date.now(),
  timeZone: () => Intl.DateTimeFormat().resolvedOptions().timeZone,
};

export const browserIds: IdGen = {
  next: () => crypto.randomUUID(),
};
