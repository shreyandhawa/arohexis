import type { Settings } from '../../domain/config';
import type { AppDeps } from '../data/DataProvider';

/** Stores the Still choice. Unset follows the system's reduced-motion setting (spec §16.8). */
export async function setStill(d: AppDeps, value: 'still' | 'moving'): Promise<void> {
  await d.config.applyConfigPatch({ settings: { brainStill: value } });
}

/** Theme, week start and check-in day. */
export async function setPreference(
  d: AppDeps,
  change: Partial<Pick<Settings, 'theme' | 'weekStartsOn' | 'checkinDay'>>,
): Promise<void> {
  await d.config.applyConfigPatch({ settings: change });
}
