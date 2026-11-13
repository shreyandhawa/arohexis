import { useCallback, useSyncExternalStore } from 'react';
import { setStill } from '../actions/preferences';
import { useData } from '../data/DataProvider';
import { useConfig } from './useConfig';

const QUERY = '(prefers-reduced-motion: reduce)';

/** Unset follows the system; a stored choice always wins (spec §16.8). */
export function effectiveStill(
  setting: 'still' | 'moving' | undefined,
  prefersReduced: boolean,
): boolean {
  return setting === undefined ? prefersReduced : setting === 'still';
}

function subscribe(onChange: () => void): () => void {
  const list = window.matchMedia(QUERY);
  list.addEventListener('change', onChange);
  return () => list.removeEventListener('change', onChange);
}

function prefersReduced(): boolean {
  return window.matchMedia(QUERY).matches;
}

export function useStill(): { still: boolean; toggle(): void } {
  const deps = useData();
  const config = useConfig();
  const reduced = useSyncExternalStore(subscribe, prefersReduced, () => false);
  const still = effectiveStill(config?.settings.brainStill, reduced);
  const toggle = useCallback(() => {
    void setStill(deps, still ? 'moving' : 'still');
  }, [deps, still]);
  return { still, toggle };
}
