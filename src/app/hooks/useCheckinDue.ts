import { useLiveQuery } from 'dexie-react-hooks';
import { isCheckinDue } from '../../domain/checkin';
import { DEFAULT_SETTINGS } from '../../domain/config';
import { daysSinceBackup } from '../actions/backup';
import { useData } from '../data/DataProvider';
import { useConfig } from './useConfig';
import { useNow } from './useNow';

const REFRESH_MS = 60_000;
export const BACKUP_NUDGE_DAYS = 14;

/** Whether this period's check-in is due, and whether to add the quiet "Back up now" link. */
export function useCheckinDue(): { due: boolean; nudgeBackup: boolean } | undefined {
  const { events, clock, db, mode } = useData();
  const config = useConfig();
  const now = useNow(REFRESH_MS);
  const submitted = useLiveQuery(() => events.listByType('checkin.submitted'), [events]);
  // With no backup yet, the days count from the first start. The demo never nudges.
  const first = useLiveQuery(async () => (await db.events.orderBy('at').first())?.at ?? null, [db]);
  if (!config || !submitted || first === undefined) return undefined;
  const tz = clock.timeZone();
  const s = config.settings;
  const due = isCheckinDue(
    now,
    tz,
    s.checkinDay ?? DEFAULT_SETTINGS.checkinDay,
    submitted.map((e) => e.weekOf),
    s.checkinDismissedWeek,
  );
  const days = daysSinceBackup(s.lastExportAt ?? first ?? undefined, now, tz);
  return { due, nudgeBackup: mode === 'main' && days !== undefined && days >= BACKUP_NUDGE_DAYS };
}
