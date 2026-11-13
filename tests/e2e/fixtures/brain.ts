/** Events for Brain space tests. Times are seconds before `now`, so they fall in the current week. */
export type SeedEvent = Record<string, unknown> & { id: string; type: string; at: number };

type Options = {
  now: number;
  /** Counted starts tagged with a part, as [partId, label, count]. */
  tagged: readonly (readonly [string, string, number])[];
  untagged: number;
  /** Starts that are made and then undone: they never count. */
  undone: number;
};

const SECOND = 1000;

type AttemptItem = {
  part?: readonly [string, string];
  undone: boolean;
  /** An on-cue start: the plan and the occurrence it answers. */
  plan?: { planId: string; occurrence: string };
};

export function startEvents(opts: Options): SeedEvent[] {
  const plan: AttemptItem[] = [];
  for (const [id, label, count] of opts.tagged)
    for (let i = 0; i < count; i += 1) plan.push({ part: [id, label], undone: false });
  for (let i = 0; i < opts.untagged; i += 1) plan.push({ undone: false });
  for (let i = 0; i < opts.undone; i += 1) plan.push({ undone: true });

  return attemptEvents(plan, opts.now);
}

/** One attempt per item, each finishing before the next opens, so every tag settles where it was made. */
function attemptEvents(plan: readonly AttemptItem[], now: number): SeedEvent[] {
  const events: SeedEvent[] = [];
  // Each attempt finishes before the next opens, so every tag settles where it was made.
  const step = 10 * SECOND;
  const first = now - (plan.length + 1) * step;
  plan.forEach((item, i) => {
    const attemptId = `seed-attempt-${i}`;
    const openedAt = first + i * step;
    const base = { tz: 'UTC', v: 1 };
    events.push({
      ...base,
      id: `${attemptId}-open`,
      type: 'attempt.opened',
      at: openedAt,
      attemptId,
      source: item.plan ? 'plan' : 'stuck',
      ...item.plan,
    });
    events.push({
      ...base,
      id: `${attemptId}-start`,
      type: 'start.made',
      at: openedAt + 2 * SECOND,
      attemptId,
      backfilled: false,
      ...item.plan,
    });
    if (item.part)
      events.push({
        ...base,
        id: `${attemptId}-tag`,
        type: 'start.tagged',
        at: openedAt + 4 * SECOND,
        attemptId,
        taskTypeId: item.part[0],
        label: item.part[1],
      });
    if (item.undone)
      events.push({
        ...base,
        id: `${attemptId}-undo`,
        type: 'start.undone',
        at: openedAt + 6 * SECOND,
        attemptId,
      });
  });
  return events;
}

/** The brief's known set: 3 Work, 2 Study, 1 untagged, 1 undone. */
export function knownEvents(now: number): SeedEvent[] {
  return startEvents({
    now,
    tagged: [
      ['work', 'Work', 3],
      ['study', 'Study', 2],
    ],
    untagged: 1,
    undone: 1,
  });
}

/** What a test seeds: events, plus parts and plans to add to the defaults. */
export type Seed = { events: SeedEvent[]; parts: object[]; plans: object[] };

/** A new user: nothing. */
export function newUser(): Seed {
  return { events: [], parts: [], plans: [] };
}

/** M1-like starts: Writing-era part ids, untagged, `other-task`, and one undone. */
export function m1History(now: number): Seed {
  const items: AttemptItem[] = [
    { part: ['writing', 'Writing'], undone: false },
    { part: ['writing', 'Writing'], undone: false },
    { part: ['admin', 'Admin'], undone: false },
    { part: ['other-task', 'Other'], undone: false },
    { undone: false },
    { undone: false },
    { part: ['writing', 'Writing'], undone: true },
  ];
  return { events: attemptEvents(items, now), parts: [], plans: [] };
}

const PLAN_BASE = {
  place: 'Desk',
  firstAction: 'Open the file',
  time: '09:00',
  days: [0, 1, 2, 3, 4, 5, 6],
  graceMin: 30,
  active: true,
  editCount: 0,
};

/**
 * Six parts, plans at every strength (3 starts: New, 7: Repeated, 20: Steady, 42: Well-worn),
 * one waiting plan, start lines in several parts, core sparks, and starts in the last minutes
 * so the signals are moving.
 */
export function full(now: number): Seed {
  const parts = [{ id: 'extra', label: 'Extra', order: 6, enabled: true, colour: 6, region: 6 }];
  const plans = [
    ['plan-new', 'work', 3],
    ['plan-repeated', 'study', 7],
    ['plan-steady', 'health', 20],
    ['plan-wellworn', 'home', 42],
  ].map(([id, partId], i) => ({
    ...PLAN_BASE,
    id,
    partId,
    createdAt: now - (10 + i) * 24 * 60 * 60 * 1000,
  }));
  plans.push({ ...PLAN_BASE, id: 'plan-waiting', partId: 'money', createdAt: now - 60_000 });

  const items: AttemptItem[] = [];
  for (const [planId, partId, count] of [
    ['plan-new', 'work', 3],
    ['plan-repeated', 'study', 7],
    ['plan-steady', 'health', 20],
    ['plan-wellworn', 'home', 42],
  ] as const)
    for (let i = 0; i < count; i += 1)
      items.push({
        part: [partId, partId],
        undone: false,
        plan: { planId, occurrence: `${planId}-${i}` },
      });
  for (const [id, label, n] of [
    ['work', 'Work', 4],
    ['study', 'Study', 3],
    ['extra', 'Extra', 2],
    ['money', 'Money', 2],
  ] as const)
    for (let i = 0; i < n; i += 1) items.push({ part: [id, label], undone: false });
  items.push({ undone: false }, { undone: false });
  return { events: attemptEvents(items, now), parts, plans };
}
