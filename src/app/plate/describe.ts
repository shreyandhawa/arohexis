import { brain } from '../../copy/brain';
import type { BrainLine, BrainSpace, PartLight } from '../../domain/brainSpace';
import type { Part } from '../../domain/config';

type PlanLine = Extract<BrainLine, { kind: 'plan' }>;

export type PartText = { partId: string | null; label: string; text: string };

function planLinesOf(space: BrainSpace, partId: string | null): PlanLine[] {
  return space.lines.filter(
    (l): l is PlanLine => l.kind === 'plan' && !l.hidden && l.partId === partId,
  );
}

function lightOf(space: BrainSpace, partId: string | null): PartLight {
  return (
    space.parts.find((p) => p.partId === partId) ?? {
      partId,
      starts: 0,
      planLines: 0,
      startLines: 0,
    }
  );
}

/** A part has light when it has starts, or a plan line that is not still waiting. */
function hasLight(space: BrainSpace, partId: string | null): boolean {
  return (
    lightOf(space, partId).starts > 0 ||
    planLinesOf(space, partId).some((l) => l.strength !== 'waiting')
  );
}

/** Parts that are enabled or have light, by `order`. */
export function shownParts(space: BrainSpace, parts: readonly Part[]): Part[] {
  return [...parts]
    .sort((x, y) => x.order - y.order)
    .filter((p) => p.enabled || hasLight(space, p.id));
}

function describe(space: BrainSpace, partId: string | null, label: string): PartText {
  const light = lightOf(space, partId);
  const items = planLinesOf(space, partId).map(
    (l) => `${brain.strength[l.strength]}, ${brain.onCue(l.onCueStarts)}`,
  );
  // Core sparks are not lines (spec §16.2), so "No part" has no start-lines clause.
  const startLines = partId !== null && light.startLines > 0 ? light.startLines : null;
  return { partId, label, text: brain.partLine(label, light.starts, items, startLines) };
}

/** The text equivalent's entries: each shown part, then No part (spec §16.10). */
export function describeParts(space: BrainSpace, parts: readonly Part[]): PartText[] {
  const entries = shownParts(space, parts).map((p) => describe(space, p.id, p.label));
  if (lightOf(space, null).starts > 0 || planLinesOf(space, null).length > 0)
    entries.push(describe(space, null, brain.noPart));
  return entries;
}
