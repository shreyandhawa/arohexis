import {
  closeTimer,
  dismissAttempt,
  makeStart,
  nameFeeling,
  openAttempt,
  tagStart,
  undoStart,
} from '../../domain/commands';
import type { EventDeps } from '../../domain/events';
import type { AppDeps } from '../data/DataProvider';

function eventDeps(d: AppDeps): EventDeps {
  return { clock: d.clock, ids: d.ids };
}

/** Opens a stuck attempt and returns its id. */
export async function beginStuck(d: AppDeps): Promise<string> {
  const opened = openAttempt(eventDeps(d), { source: 'stuck' });
  await d.events.append([opened]);
  return opened.attemptId;
}

export async function chooseFeeling(
  d: AppDeps,
  attemptId: string,
  feelingId: string,
): Promise<void> {
  const deps = eventDeps(d);
  const config = await d.config.getConfig();
  const shown = await d.events.listByType('response.shown');
  const feeling = config.feelings.find((f) => f.id === feelingId);
  if (!feeling) throw new Error(`Unknown feeling: ${feelingId}`);
  await d.events.appendForAttempt(attemptId, (evts) =>
    nameFeeling(deps, evts, attemptId, feeling, config.responses, shown),
  );
}

/** Makes the start. After the first counted start ever, asks for persistent storage once. */
export async function start(d: AppDeps, attemptId: string): Promise<void> {
  const deps = eventDeps(d);
  const appended = await d.events.appendForAttempt(attemptId, (evts) =>
    makeStart(deps, evts, attemptId),
  );
  if (!appended.some((e) => e.type === 'start.made')) return;
  const { settings } = await d.config.getConfig();
  if (settings.persistRequested) return;
  // Not awaited: Firefox shows a permission prompt, and waiting on it would hold up the
  // reward. The browser may refuse or lack the API; the start itself still counts.
  void Promise.resolve()
    .then(() => d.persist())
    .catch((error: unknown) => console.error(error));
  await d.config.applyConfigPatch({ settings: { persistRequested: true } });
}

export async function undo(d: AppDeps, attemptId: string): Promise<void> {
  const deps = eventDeps(d);
  await d.events.appendForAttempt(attemptId, (evts) => undoStart(deps, evts, attemptId));
}

export async function tag(d: AppDeps, attemptId: string, partId: string): Promise<void> {
  const deps = eventDeps(d);
  const { parts } = await d.config.getConfig();
  const part = parts.find((p) => p.id === partId);
  if (!part) throw new Error(`Unknown part: ${partId}`);
  await d.events.appendForAttempt(attemptId, (evts) => tagStart(deps, evts, attemptId, part));
}

export async function finishTimer(
  d: AppDeps,
  attemptId: string,
  outcome: 'kept-going' | 'stopped',
): Promise<void> {
  const deps = eventDeps(d);
  await d.events.appendForAttempt(attemptId, (evts) => closeTimer(deps, evts, attemptId, outcome));
}

export async function notNow(d: AppDeps, attemptId: string): Promise<void> {
  const deps = eventDeps(d);
  await d.events.appendForAttempt(attemptId, (evts) => dismissAttempt(deps, evts, attemptId));
}
