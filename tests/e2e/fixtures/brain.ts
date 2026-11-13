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

export function startEvents(opts: Options): SeedEvent[] {
  const events: SeedEvent[] = [];
  const plan: { part?: readonly [string, string]; undone: boolean }[] = [];
  for (const [id, label, count] of opts.tagged)
    for (let i = 0; i < count; i += 1) plan.push({ part: [id, label], undone: false });
  for (let i = 0; i < opts.untagged; i += 1) plan.push({ undone: false });
  for (let i = 0; i < opts.undone; i += 1) plan.push({ undone: true });

  // Each attempt finishes before the next opens, so every tag settles where it was made.
  const step = 10 * SECOND;
  const first = opts.now - (plan.length + 1) * step;
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
      source: 'stuck',
    });
    events.push({
      ...base,
      id: `${attemptId}-start`,
      type: 'start.made',
      at: openedAt + 2 * SECOND,
      attemptId,
      backfilled: false,
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
