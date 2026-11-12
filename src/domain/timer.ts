export const TIMER_SECONDS = 120;
export const UNDO_PROMINENT_MS = 10_000;

/** Derived purely from timestamps, so a locked phone shows done on reopen. */
export function timerState(
  startAt: number,
  now: number,
): { elapsedSec: number; remainingSec: number; done: boolean } {
  const elapsedSec = Math.max(0, Math.floor((now - startAt) / 1000));
  return {
    elapsedSec,
    remainingSec: Math.max(0, TIMER_SECONDS - elapsedSec),
    done: elapsedSec >= TIMER_SECONDS,
  };
}

export function isUndoProminent(startAt: number, now: number): boolean {
  return now - startAt < UNDO_PROMINENT_MS;
}
