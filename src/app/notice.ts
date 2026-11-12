import { homeNotices } from '../copy/stuck';

export type HomeNotice = keyof typeof homeNotices;

/** The notice carried in router state, if it is one we know. */
export function readNotice(state: unknown): HomeNotice | undefined {
  if (typeof state !== 'object' || state === null || !('notice' in state)) return undefined;
  const notice = (state as { notice: unknown }).notice;
  return typeof notice === 'string' && notice in homeNotices ? (notice as HomeNotice) : undefined;
}
