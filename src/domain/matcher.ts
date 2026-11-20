import type { Attempt } from './attempts';
import type { FeelingResponse } from './config';
import { GENERIC_RESPONSE_ID } from './defaults';
import type { ResponseShown } from './events';
import { EARLY_DAYS_BELOW, responseStats } from './metrics';

/**
 * Picks the enabled response for the feeling. By default, the one shown least
 * recently: never-shown ranks oldest and ties go to the lowest order. Once every
 * candidate has been shown at least EARLY_DAYS_BELOW times, two picks in three
 * (counted from this feeling's shown events) take the best led-to-a-start rate,
 * ties falling back to least recently shown, then lowest order; the third keeps
 * the rotation. With no candidates, returns generic.any (whatever its enabled flag).
 */
export function pickResponse(
  feelingId: string,
  responses: readonly FeelingResponse[],
  shown: readonly ResponseShown[],
  attempts: readonly Attempt[] = [],
): FeelingResponse {
  const lastShown = new Map<string, number>();
  let shownForFeeling = 0;
  for (const e of shown) {
    if (e.feelingId === feelingId) shownForFeeling++;
    const prev = lastShown.get(e.responseId);
    if (prev === undefined || e.at > prev) lastShown.set(e.responseId, e.at);
  }
  const candidates = responses.filter((r) => r.feelingId === feelingId && r.enabled);
  const at = (r: FeelingResponse) => lastShown.get(r.id) ?? Number.NEGATIVE_INFINITY;
  const oldest = (a: FeelingResponse, b: FeelingResponse) => at(a) - at(b) || a.order - b.order;
  // Never-shown pairs give NaN (-Infinity minus -Infinity), which `||` skips to order.
  const rotation = [...candidates].sort(oldest)[0];

  let best = rotation;
  if (candidates.length > 0 && shownForFeeling % 3 !== 2) {
    const stats = new Map(responseStats(attempts).map((s) => [s.responseId, s]));
    if (candidates.every((r) => (stats.get(r.id)?.shown ?? 0) >= EARLY_DAYS_BELOW)) {
      const rate = (r: FeelingResponse) => stats.get(r.id)?.rate ?? 0;
      best = [...candidates].sort((a, b) => rate(b) - rate(a) || oldest(a, b))[0];
    }
  }
  if (best) return best;
  const generic = responses.find((r) => r.id === GENERIC_RESPONSE_ID);
  if (!generic) throw new Error(`Missing required response: ${GENERIC_RESPONSE_ID}`);
  return generic;
}
