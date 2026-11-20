/** A first visit lands only a start this recent, so a long record's old starts are not replayed. */
export const LAND_FRESH_MS = 60 * 60 * 1000;

/** The line to land on: the newest start's, when it is newer than the last one shown (spec §16.8). */
export function landFor(
  newest: { at: number; lineId: string } | undefined,
  lastSeen: number | undefined,
  now: number,
): string | undefined {
  if (!newest) return undefined;
  if (lastSeen === undefined) return now - newest.at <= LAND_FRESH_MS ? newest.lineId : undefined;
  return newest.at > lastSeen ? newest.lineId : undefined;
}
