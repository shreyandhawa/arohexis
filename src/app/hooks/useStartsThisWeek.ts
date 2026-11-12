import { useLiveQuery } from 'dexie-react-hooks';
import { foldAttempts } from '../../domain/attempts';
import { DEFAULT_SETTINGS } from '../../domain/config';
import { startsThisWeek } from '../../domain/metrics';
import { useData } from '../data/DataProvider';
import { useConfig } from './useConfig';
import { useNow } from './useNow';

const WEEK_REFRESH_MS = 60_000;

/** Counted starts in the current week; 0 until the data has loaded. */
export function useStartsThisWeek(): number {
  const { events, clock } = useData();
  const config = useConfig();
  const now = useNow(WEEK_REFRESH_MS);
  const all = useLiveQuery(() => events.list(), [events]);
  if (!all) return 0;
  const weekStartsOn = config?.settings.weekStartsOn ?? DEFAULT_SETTINGS.weekStartsOn;
  return startsThisWeek(foldAttempts(all), now, clock.timeZone(), weekStartsOn);
}
