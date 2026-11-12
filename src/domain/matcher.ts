import type { FeelingResponse } from './config';
import { GENERIC_RESPONSE_ID } from './defaults';
import type { ResponseShown } from './events';

/**
 * Picks the enabled response for the feeling that was shown least recently.
 * Never-shown responses rank oldest; ties go to the lowest order.
 * With no candidates, returns generic.any (whatever its enabled flag).
 */
export function pickResponse(
  feelingId: string,
  responses: readonly FeelingResponse[],
  shown: readonly ResponseShown[],
): FeelingResponse {
  const lastShown = new Map<string, number>();
  for (const e of shown) {
    const prev = lastShown.get(e.responseId);
    if (prev === undefined || e.at > prev) lastShown.set(e.responseId, e.at);
  }
  let best: FeelingResponse | undefined;
  let bestAt = 0;
  for (const r of responses) {
    if (r.feelingId !== feelingId || !r.enabled) continue;
    const at = lastShown.get(r.id) ?? Number.NEGATIVE_INFINITY;
    if (best === undefined || at < bestAt || (at === bestAt && r.order < best.order)) {
      best = r;
      bestAt = at;
    }
  }
  if (best) return best;
  const generic = responses.find((r) => r.id === GENERIC_RESPONSE_ID);
  if (!generic) throw new Error(`Missing required response: ${GENERIC_RESPONSE_ID}`);
  return generic;
}
