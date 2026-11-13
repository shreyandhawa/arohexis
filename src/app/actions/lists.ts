import { wordCount } from '../../copy/rules';
import type { Feeling, FeelingResponse, ListItem } from '../../domain/config';
import { GENERIC_RESPONSE_ID, OTHER_FEELING_ID } from '../../domain/defaults';
import type { Basis } from '../../domain/events';
import type { AppDeps } from '../data/DataProvider';

export const LABEL_MAX = 40;
export const RESPONSE_WORDS_MAX = 40;
export type ListError = 'label' | 'words';

function cleanLabel(label: string): string | undefined {
  const t = label.trim();
  return t.length >= 1 && t.length <= LABEL_MAX ? t : undefined;
}

export function bodyError(body: string): boolean {
  const n = wordCount(body);
  return n < 1 || n > RESPONSE_WORDS_MAX;
}

type Row = { id: string; label: string; order: number; enabled: boolean };

/** Rows whose order changes when `id` moves one place. `fixedLast` never moves and stays last. */
export function moved<T extends Row>(
  rows: readonly T[],
  id: string,
  by: -1 | 1,
  fixedLast?: string,
): T[] {
  const list = rows.filter((r) => r.id !== fixedLast).sort((a, b) => a.order - b.order);
  const from = list.findIndex((r) => r.id === id);
  const to = from + by;
  if (from < 0 || to < 0 || to >= list.length) return [];
  const [item] = list.splice(from, 1);
  if (!item) return [];
  list.splice(to, 0, item);
  return list.map((r, i) => ({ ...r, order: i + 1 })).filter((r) => r.order !== byId(rows, r.id));
}

function byId(rows: readonly Row[], id: string): number | undefined {
  return rows.find((r) => r.id === id)?.order;
}

function nextOrder(rows: readonly Row[], fixedLast?: string): number {
  return rows.filter((r) => r.id !== fixedLast).reduce((max, r) => Math.max(max, r.order), 0) + 1;
}

export async function renameFeeling(
  d: AppDeps,
  id: string,
  label: string,
): Promise<ListError | undefined> {
  const clean = cleanLabel(label);
  if (clean === undefined) return 'label';
  await d.db.feelings.update(id, { label: clean });
  return undefined;
}

export async function setFeelingEnabled(d: AppDeps, id: string, enabled: boolean): Promise<void> {
  // "Something else" is always on: nothing else can catch a feeling that fits no other.
  if (id === OTHER_FEELING_ID) return;
  await d.db.feelings.update(id, { enabled });
}

export async function moveFeeling(d: AppDeps, id: string, by: -1 | 1): Promise<void> {
  const rows = moved(await d.db.feelings.toArray(), id, by, OTHER_FEELING_ID);
  if (rows.length > 0) await d.db.feelings.bulkPut(rows);
}

export async function addFeeling(d: AppDeps, label: string): Promise<ListError | undefined> {
  const clean = cleanLabel(label);
  if (clean === undefined) return 'label';
  const order = nextOrder(await d.db.feelings.toArray(), OTHER_FEELING_ID);
  const feeling: Feeling = { id: d.ids.next(), label: clean, order, enabled: true, builtIn: false };
  await d.db.feelings.add(feeling);
  return undefined;
}

export async function renameObstacle(
  d: AppDeps,
  id: string,
  label: string,
): Promise<ListError | undefined> {
  const clean = cleanLabel(label);
  if (clean === undefined) return 'label';
  await d.db.obstacles.update(id, { label: clean });
  return undefined;
}

export async function setObstacleEnabled(d: AppDeps, id: string, enabled: boolean): Promise<void> {
  await d.db.obstacles.update(id, { enabled });
}

export async function moveObstacle(d: AppDeps, id: string, by: -1 | 1): Promise<void> {
  const rows = moved(await d.db.obstacles.toArray(), id, by);
  if (rows.length > 0) await d.db.obstacles.bulkPut(rows);
}

export async function addObstacle(d: AppDeps, label: string): Promise<ListError | undefined> {
  const clean = cleanLabel(label);
  if (clean === undefined) return 'label';
  const item: ListItem = {
    id: d.ids.next(),
    label: clean,
    order: nextOrder(await d.db.obstacles.toArray()),
    enabled: true,
  };
  await d.db.obstacles.add(item);
  return undefined;
}

export async function editResponse(
  d: AppDeps,
  id: string,
  change: { body?: string; basis?: Basis; enabled?: boolean },
): Promise<ListError | undefined> {
  const next: Partial<FeelingResponse> = {};
  if (change.body !== undefined) {
    if (bodyError(change.body)) return 'words';
    next.body = change.body.trim().replace(/\s+/g, ' ');
  }
  if (change.basis !== undefined) next.basis = change.basis;
  // The general response is what "Something else" and empty feelings fall back to.
  if (change.enabled !== undefined && id !== GENERIC_RESPONSE_ID) next.enabled = change.enabled;
  await d.db.responses.update(id, next);
  return undefined;
}

export async function addResponse(
  d: AppDeps,
  feelingId: string,
  body: string,
  basis: Basis = 'shrink-the-step',
): Promise<ListError | undefined> {
  if (bodyError(body)) return 'words';
  const mine = (await d.db.responses.toArray()).filter((r) => r.feelingId === feelingId);
  const response: FeelingResponse = {
    id: d.ids.next(),
    feelingId,
    body: body.trim().replace(/\s+/g, ' '),
    basis,
    enabled: true,
    order: mine.reduce((max, r) => Math.max(max, r.order), 0) + 1,
    builtIn: false,
  };
  await d.db.responses.add(response);
  return undefined;
}
