import { type Attempt, isCountedStart } from './attempts';
import type { Part, Plan } from './config';

export const RESTING_AFTER_MS = 48 * 60 * 60 * 1000;
export const RESTING_BRIGHTNESS = 0.85;
export const STRENGTH_STEPS = [1, 5, 15, 40] as const;
export type Strength = 'waiting' | 1 | 2 | 3 | 4;
export type BrainLine =
  | {
      kind: 'plan';
      id: string;
      planId: string;
      partId: string | null;
      onCueStarts: number;
      strength: Strength;
      order: number;
      everStarted: boolean;
      hidden: boolean;
    }
  | {
      kind: 'start';
      id: string;
      partId: string | null;
      at: number;
      order: number;
      settled: boolean;
      undone: boolean;
    };
export type PartLight = {
  partId: string | null;
  starts: number;
  planLines: number;
  startLines: number;
};
export type BrainSpace = {
  lines: BrainLine[];
  parts: PartLight[];
  motion: 'moving' | 'resting';
  totalStarts: number;
};

export function isOnCue(a: Attempt): boolean {
  return isCountedStart(a) && a.planId !== undefined && a.occurrence !== undefined;
}

/** A start's part: its latest tag. Insights counts by the same rule. */
export function partOfStart(a: Attempt): string | null {
  return a.part?.id ?? null;
}

export function strengthFor(onCueStarts: number): Strength {
  let strength: Strength = 'waiting';
  STRENGTH_STEPS.forEach((step, i) => {
    if (onCueStarts >= step) strength = (i + 1) as 1 | 2 | 3 | 4;
  });
  return strength;
}

/** The latest tag made at or before `settledAt`, or the latest tag while unsettled. */
export function lightPartOf(a: Attempt, settledAt: number | undefined): string | null {
  let id: string | null = null;
  for (const tag of a.tags) {
    if (settledAt === undefined || tag.at <= settledAt) id = tag.id;
  }
  return id;
}

/** Plan lines that aren't waiting, plus start lines with a part that aren't undone. */
export function summaryLines(space: BrainSpace): number {
  return space.lines.filter((l) =>
    l.kind === 'plan' ? l.strength !== 'waiting' : l.partId !== null && !l.undone,
  ).length;
}

type PlanLine = Extract<BrainLine, { kind: 'plan' }>;

export function projectBrainSpace(
  attempts: readonly Attempt[],
  plans: readonly Plan[],
  parts: readonly Part[],
  now: number,
): BrainSpace {
  const known = new Set(parts.map((p) => p.id));
  const normal = (id: string | null): string | null => (id !== null && known.has(id) ? id : null);
  const planById = new Map(plans.map((p) => [p.id, p]));

  const planLines = new Map<string, PlanLine>();
  const startLines: BrainLine[] = [];
  const onCueOccurrences = new Set<string>();
  const counts = new Map<string | null, number>();
  let totalStarts = 0;
  let newestStart = -Infinity;

  attempts.forEach((a, i) => {
    if (!a.start) return;
    const part = normal(lightPartOf(a, attempts[i + 1]?.openedAt));
    const counted = isCountedStart(a);
    if (counted) {
      totalStarts += 1;
      newestStart = Math.max(newestStart, a.start.at);
      const own = normal(partOfStart(a));
      counts.set(own, (counts.get(own) ?? 0) + 1);
    }
    const key =
      a.planId !== undefined && a.occurrence !== undefined
        ? `${a.planId}\n${a.occurrence}`
        : undefined;
    const joinsLine = key !== undefined && !onCueOccurrences.has(key);
    if (joinsLine && a.planId !== undefined) {
      if (counted) onCueOccurrences.add(key);
      const id = `${a.planId}:${part ?? 'core'}`;
      const line = planLines.get(id) ?? {
        kind: 'plan' as const,
        id,
        planId: a.planId,
        partId: part,
        onCueStarts: 0,
        strength: 'waiting' as Strength,
        order: a.start.at,
        everStarted: true,
        hidden: false,
      };
      line.order = Math.min(line.order, a.start.at);
      if (counted) line.onCueStarts += 1;
      planLines.set(id, line);
      return;
    }
    startLines.push({
      kind: 'start',
      id: a.id,
      partId: part,
      at: a.start.at,
      order: a.start.at,
      settled: i + 1 < attempts.length,
      undone: a.undone,
    });
  });

  const lines: PlanLine[] = [];
  for (const line of planLines.values()) {
    const active = planById.get(line.planId)?.active === true;
    line.strength = strengthFor(line.onCueStarts);
    line.hidden = line.onCueStarts === 0 && !active;
    lines.push(line);
  }
  // A plan that never had a start waits in its own part, and only while it is active.
  const started = new Set(lines.map((l) => l.planId));
  const waiting: PlanLine[] = [];
  for (const p of plans) {
    if (!p.active || started.has(p.id)) continue;
    const partId = normal(p.partId ?? null);
    waiting.push({
      kind: 'plan',
      id: `${p.id}:${partId ?? 'core'}`,
      planId: p.id,
      partId,
      onCueStarts: 0,
      strength: 'waiting',
      order: p.createdAt,
      everStarted: false,
      hidden: false,
    });
  }

  const byOrder = (x: BrainLine, y: BrainLine) =>
    x.order - y.order || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0);
  const ordered = [...lines, ...startLines].sort(byOrder);
  const all = [...ordered, ...waiting.sort(byOrder)];

  const light = (partId: string | null): PartLight => ({
    partId,
    starts: counts.get(partId) ?? 0,
    planLines: lines.filter((l) => l.partId === partId && !l.hidden).length,
    startLines: startLines.filter((l) => l.kind === 'start' && l.partId === partId && !l.undone)
      .length,
  });
  const partLights = [...parts].sort((x, y) => x.order - y.order).map((p) => light(p.id));
  const core = light(null);
  if (core.starts > 0) partLights.push(core);

  return {
    lines: all,
    parts: partLights,
    motion: now - newestStart <= RESTING_AFTER_MS ? 'moving' : 'resting',
    totalStarts,
  };
}
