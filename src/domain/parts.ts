import type { ColourId, ListItem, Part, RegionId } from './config';

export const MAX_PARTS = 6;
export const PART_LABEL_MAX = 24;
export type PartError = 'limit' | 'label';

const SLOTS: readonly (ColourId & RegionId)[] = [1, 2, 3, 4, 5, 6];

function cleanLabel(label: string): string | undefined {
  const t = label.trim();
  return t.length >= 1 && t.length <= PART_LABEL_MAX ? t : undefined;
}

/** Spec §16.3: M1 task types become parts, in order, skipping `other-task` and disabled types. */
export function migrateTaskTypes(taskTypes: readonly ListItem[]): Part[] {
  return taskTypes
    .filter((t) => t.enabled && t.id !== 'other-task')
    .sort((a, b) => a.order - b.order)
    .slice(0, MAX_PARTS)
    .map((t, i) => {
      const slot = SLOTS[i] as ColourId & RegionId;
      return {
        id: t.id,
        label: t.label,
        order: i + 1,
        enabled: true,
        colour: slot,
        region: slot,
      };
    });
}

/** Returns the records to upsert: the new part. */
export function addPart(
  parts: readonly Part[],
  input: { id: string; label: string },
): Part[] | PartError {
  if (parts.length >= MAX_PARTS) return 'limit';
  const label = cleanLabel(input.label);
  if (label === undefined) return 'label';
  const region = SLOTS.find((s) => !parts.some((p) => p.region === s));
  const colour = SLOTS.find((s) => !parts.some((p) => p.colour === s));
  /* v8 ignore next -- unreachable while parts are valid: fewer than six leaves a free slot */
  if (region === undefined || colour === undefined) return 'limit';
  const order = parts.reduce((max, p) => Math.max(max, p.order), 0) + 1;
  return [{ id: input.id, label, order, enabled: true, colour, region }];
}

/** Returns the records to upsert. A colour held by another part is swapped with it (ADR-035). */
export function editPart(
  parts: readonly Part[],
  id: string,
  change: { label?: string; colour?: ColourId; enabled?: boolean },
): Part[] | PartError {
  const part = parts.find((p) => p.id === id);
  if (!part) return [];
  let label = part.label;
  if (change.label !== undefined) {
    const clean = cleanLabel(change.label);
    if (clean === undefined) return 'label';
    label = clean;
  }
  const edited: Part = {
    ...part,
    label,
    enabled: change.enabled ?? part.enabled,
    colour: change.colour ?? part.colour,
  };
  const holder =
    edited.colour === part.colour
      ? undefined
      : parts.find((p) => p.id !== id && p.colour === edited.colour);
  return holder ? [edited, { ...holder, colour: part.colour }] : [edited];
}

/** Human-readable problems; [] when the set is valid. */
export function validateParts(parts: readonly Part[]): string[] {
  const out: string[] = [];
  if (parts.length > MAX_PARTS) out.push(`more than ${MAX_PARTS} parts`);
  if (new Set(parts.map((p) => p.region)).size !== parts.length) out.push('duplicate region');
  if (new Set(parts.map((p) => p.colour)).size !== parts.length) out.push('duplicate colour');
  for (const p of parts) {
    if (cleanLabel(p.label) === undefined) out.push(`bad label for ${p.id}`);
  }
  return out;
}
