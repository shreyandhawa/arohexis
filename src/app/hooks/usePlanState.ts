import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import type { Plan } from '../../domain/config';
import { findLapseToRepair } from '../../domain/lapse';
import { openOccurrence, type Occurrence } from '../../domain/plans';
import { useData } from '../data/DataProvider';
import { useConfig } from './useConfig';
import { useNow } from './useNow';

const REFRESH_MS = 15_000;

export type PlanState = {
  /** The plan whose occurrence is open now (the earliest, when several are). */
  due?: { plan: Plan; occurrence: Occurrence };
  /** The one lapse to repair, and the occurrences to expire quietly. */
  repair?: { plan: Plan; occurrence: Occurrence };
  expire: Occurrence[];
};

/** What Home asks of the plans: the plan due now and the lapse to repair. Undefined until loaded. */
export function usePlanState(): PlanState | undefined {
  const { events, clock } = useData();
  const config = useConfig();
  const now = useNow(REFRESH_MS);
  const all = useLiveQuery(() => events.list(), [events]);
  return useMemo(() => {
    if (!config || !all) return undefined;
    const tz = clock.timeZone();
    const lapse = findLapseToRepair(config.plans, all, now, tz);
    const open = config.plans
      .map((plan) => ({ plan, occurrence: openOccurrence(plan, all, now, tz) }))
      .flatMap((x) => (x.occurrence ? [{ plan: x.plan, occurrence: x.occurrence }] : []))
      .sort((a, b) => a.occurrence.at - b.occurrence.at);
    const due = open[0];
    return {
      ...(due && { due }),
      ...(lapse.repair && { repair: lapse.repair }),
      expire: lapse.expire,
    };
  }, [all, config, now, clock]);
}
