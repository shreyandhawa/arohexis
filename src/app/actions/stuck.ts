import { findAttempt } from '../../domain/attempts';
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
export async function beginStuck(
  d: AppDeps,
  link?: { planId: string; occurrence: string },
): Promise<string> {
  const opened = openAttempt(
    eventDeps(d),
    link ? { source: 'plan', ...link } : { source: 'stuck' },
  );
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

/** Makes the start. A start from a plan is linked to it and tagged with its part, in one append. */
export async function start(d: AppDeps, attemptId: string): Promise<void> {
  const deps = eventDeps(d);
  const config = await d.config.getConfig();
  const appended = await d.events.appendForAttempt(attemptId, (evts) => {
    const a = findAttempt(evts, attemptId);
    const planId = a?.planId;
    const made = makeStart(
      deps,
      evts,
      attemptId,
      planId === undefined
        ? undefined
        : {
            planId,
            ...(a?.occurrence !== undefined && { occurrence: a.occurrence }),
            backfilled: false,
          },
    );
    const partId = config.plans.find((p) => p.id === planId)?.partId;
    const part = partId === undefined ? undefined : config.parts.find((p) => p.id === partId);
    if (made.length === 0 || !part) return made;
    return [...made, ...tagStart(deps, [...evts, ...made], attemptId, part)];
  });
  if (appended.some((e) => e.type === 'start.made')) await afterFirstStart(d);
}

/** After a counted start, asks for persistent storage once. */
export async function afterFirstStart(d: AppDeps): Promise<void> {
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
