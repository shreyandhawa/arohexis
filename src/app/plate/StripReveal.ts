import type { BrainSpace } from '../../domain/brainSpace';

/**
 * The line a new start lights: its own line, else its plan's line. Undefined when the space has
 * neither, so the strip shows only its summary line.
 */
export function revealLineId(
  space: Pick<BrainSpace, 'lines'>,
  attemptId: string,
  planId: string | undefined,
  partId: string | null,
): string | undefined {
  const has = (id: string) => space.lines.some((l) => l.id === id);
  if (has(attemptId)) return attemptId;
  const planLine = `${planId ?? ''}:${partId ?? 'core'}`;
  return has(planLine) ? planLine : undefined;
}
