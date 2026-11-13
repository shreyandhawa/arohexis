import { checkinPeriod, type CheckinAnswers } from '../../domain/checkin';
import { createEvent } from '../../domain/events';
import type { AppDeps } from '../data/DataProvider';

/** Records this period's check-in. A later one for the same week replaces it in the trend. */
export async function submitCheckin(d: AppDeps, answers: CheckinAnswers): Promise<void> {
  const config = await d.config.getConfig();
  const weekOf = checkinPeriod(d.clock.now(), d.clock.timeZone(), config.settings.checkinDay);
  await d.events.append([
    createEvent({ clock: d.clock, ids: d.ids }, 'checkin.submitted', { weekOf, answers }),
  ]);
}

/** Skip this week: the card and the screen's prompt rest until the next period. */
export async function skipCheckin(d: AppDeps): Promise<void> {
  const config = await d.config.getConfig();
  const weekOf = checkinPeriod(d.clock.now(), d.clock.timeZone(), config.settings.checkinDay);
  await d.config.applyConfigPatch({ settings: { checkinDismissedWeek: weekOf } });
}
