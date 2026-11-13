import type { ColourId } from '../../domain/config';
import { addPart as planAdd, editPart, type PartError } from '../../domain/parts';
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
