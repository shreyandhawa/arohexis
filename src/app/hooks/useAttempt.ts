import { useLiveQuery } from 'dexie-react-hooks';
import { findAttempt, type Attempt } from '../../domain/attempts';
import { useData } from '../data/DataProvider';

/** The attempt, `undefined` while loading and `null` when it does not exist. */
export function useAttempt(attemptId: string): Attempt | null | undefined {
  const { events } = useData();
  return useLiveQuery(
    async () => findAttempt(await events.listByAttempt(attemptId), attemptId) ?? null,
    [events, attemptId],
  );
}
