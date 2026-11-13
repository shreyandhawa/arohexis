export type PlanLink = { planId: string; occurrence: string };

/** The plan an "I'm stuck on this" tap carries to the stuck flow, if router state has one. */
export function readPlanLink(state: unknown): PlanLink | undefined {
  if (typeof state !== 'object' || state === null) return undefined;
  const { planId, occurrence } = state as { planId?: unknown; occurrence?: unknown };
  return typeof planId === 'string' && typeof occurrence === 'string'
    ? { planId, occurrence }
    : undefined;
}
