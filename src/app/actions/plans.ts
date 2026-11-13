import type { Plan, WeekDay } from '../../domain/config';
import { planToIcs } from '../../domain/ics';
import { validatePlan } from '../../domain/plans';
import type { AppDeps } from '../data/DataProvider';

export const DEFAULT_GRACE_MIN = 90; // plan.md Global Constraints

export type PlanDraft = {
  time: string;
  days: WeekDay[];
  place: string;
  cueDetail: string;
  firstAction: string;
  partId: string;
};

export type PlanProblem = 'time' | 'days' | 'firstAction' | 'graceMin';

export function emptyDraft(): PlanDraft {
  return {
    time: '09:00',
    days: [1, 2, 3, 4, 5],
    place: '',
    cueDetail: '',
    firstAction: '',
    partId: '',
  };
}

export function draftOf(plan: Plan): PlanDraft {
  return {
    time: plan.time,
    days: [...plan.days],
    place: plan.place,
    cueDetail: plan.cueDetail ?? '',
    firstAction: plan.firstAction,
    partId: plan.partId ?? '',
  };
}

/** A plan record from a draft; optional fields are left out when empty. */
export function planFromDraft(base: Plan, draft: PlanDraft): Plan {
  const rest: Plan = { ...base };
  delete rest.cueDetail;
  delete rest.partId;
  const cue = draft.cueDetail.trim();
  return {
    ...rest,
    time: draft.time,
    days: [...draft.days].sort((a, b) => a - b),
    place: draft.place.trim(),
    firstAction: draft.firstAction.trim(),
    ...(cue ? { cueDetail: cue } : {}),
    ...(draft.partId ? { partId: draft.partId } : {}),
  };
}

/** Saves a new plan (no `existing`) or an edit. Returns the problems, or the saved id. */
export async function savePlan(
  d: AppDeps,
  draft: PlanDraft,
  existing: Plan | undefined,
): Promise<{ problems: PlanProblem[] } | { id: string }> {
  const base: Plan = existing ?? {
    id: d.ids.next(),
    place: '',
    firstAction: '',
    time: draft.time,
    days: [],
    graceMin: DEFAULT_GRACE_MIN,
    active: true,
    createdAt: d.clock.now(),
    editCount: 0,
  };
  const plan = planFromDraft(base, draft);
  const problems = validatePlan(plan) as PlanProblem[];
  if (problems.length > 0) return { problems };
  await d.config.applyConfigPatch({ plans: existing ? { update: [plan] } : { add: [plan] } });
  return { id: plan.id };
}

export async function setPlanActive(d: AppDeps, plan: Plan, active: boolean): Promise<void> {
  await d.config.applyConfigPatch({
    plans: active ? { update: [{ ...plan, active: true }] } : { pause: [plan.id] },
  });
}

export function icsFileName(plan: Plan, fallback: string): string {
  const slug = plan.firstAction
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `${slug || fallback}.ics`;
}

/** Downloads the plan as an .ics file (spec §8.5). */
export function downloadIcs(d: AppDeps, plan: Plan, fallback: string): void {
  const text = planToIcs(plan, d.clock.timeZone(), d.clock.now());
  const file = new File([text], icsFileName(plan, fallback), { type: 'text/calendar' });
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
