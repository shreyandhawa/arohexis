import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { foldAttempts } from '../../domain/attempts';
import { projectBrainSpace, type BrainSpace } from '../../domain/brainSpace';
import type { Part } from '../../domain/config';
import { useData } from '../data/DataProvider';
import { useConfig } from './useConfig';
import { useNow } from './useNow';

const REFRESH_MS = 60_000;

/** Brain space for the current data; undefined until it has loaded. */
export function useBrainSpace(): { space: BrainSpace; parts: readonly Part[] } | undefined {
  const { events } = useData();
  const config = useConfig();
  const now = useNow(REFRESH_MS);
  const all = useLiveQuery(() => events.list(), [events]);
  return useMemo(() => {
    if (!all || !config) return undefined;
    const space = projectBrainSpace(foldAttempts(all), config.plans, config.parts, now);
    return { space, parts: config.parts };
  }, [all, config, now]);
}
