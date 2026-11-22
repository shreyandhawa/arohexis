import type { ColourId, Part } from '../../domain/config';
import { addPart as planAdd, editPart, MAX_PARTS, type PartError } from '../../domain/parts';
import type { AppDeps } from '../data/DataProvider';

export async function addPart(d: AppDeps, label: string): Promise<PartError | undefined> {
  const { parts } = await d.config.getConfig();
  const result = planAdd(parts, { id: d.ids.next(), label });
  if (typeof result === 'string') return result;
  await d.config.applyConfigPatch({ parts: result });
  return undefined;
}

async function edit(
  d: AppDeps,
  id: string,
  change: { label?: string; colour?: ColourId; enabled?: boolean },
): Promise<PartError | undefined> {
  const { parts } = await d.config.getConfig();
  const result = editPart(parts, id, change);
  if (typeof result === 'string') return result;
  await d.config.applyConfigPatch({ parts: result });
  return undefined;
}

export function renamePart(d: AppDeps, id: string, label: string): Promise<PartError | undefined> {
  return edit(d, id, { label });
}

export function recolorPart(
  d: AppDeps,
  id: string,
  colour: ColourId,
): Promise<PartError | undefined> {
  return edit(d, id, { colour });
}

export async function setPartEnabled(d: AppDeps, id: string, enabled: boolean): Promise<void> {
  await edit(d, id, { enabled });
}

/**
 * First-run setup (ADR-045): the seeded parts take the typed names in order, a seeded part
 * left unnamed is hidden, and names past the seeded ones are added. Blank and repeated names are dropped.
 */
export async function setUpParts(
  d: AppDeps,
  names: readonly string[],
): Promise<PartError | undefined> {
  const byKey = new Map<string, string>();
  for (const name of names.map((n) => n.trim()).filter(Boolean)) {
    if (!byKey.has(name.toLowerCase())) byKey.set(name.toLowerCase(), name);
  }
  const wanted = [...byKey.values()].slice(0, MAX_PARTS);
  if (wanted.length === 0) return 'label';
  const merged = new Map<string, Part>();
  for (const p of (await d.config.getConfig()).parts) merged.set(p.id, p);
  const apply = (result: Part[] | PartError): PartError | undefined => {
    if (typeof result === 'string') return result;
    for (const p of result) merged.set(p.id, p);
    return undefined;
  };
  const seeded = [...merged.values()].sort((a, b) => a.order - b.order);
  for (const [i, part] of seeded.entries()) {
    const label = wanted[i];
    const change = label === undefined ? { enabled: false } : { label, enabled: true };
    const error = apply(editPart([...merged.values()], part.id, change));
    if (error) return error;
  }
  for (const label of wanted.slice(seeded.length)) {
    const error = apply(planAdd([...merged.values()], { id: d.ids.next(), label }));
    if (error) return error;
  }
  await d.config.applyConfigPatch({ parts: [...merged.values()] });
  return undefined;
}
