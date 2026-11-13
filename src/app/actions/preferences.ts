import type { AppDeps } from '../data/DataProvider';

/** Stores the Still choice. Unset follows the system's reduced-motion setting (spec §16.8). */
export async function setStill(d: AppDeps, value: 'still' | 'moving'): Promise<void> {
  await d.config.applyConfigPatch({ settings: { brainStill: value } });
}
