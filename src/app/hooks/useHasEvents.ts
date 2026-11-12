import { useLiveQuery } from 'dexie-react-hooks';
import { useData } from '../data/DataProvider';

/** Whether the main database holds any event; undefined until it has loaded. */
export function useHasEvents(): boolean | undefined {
  const { db } = useData();
  const count = useLiveQuery(() => db.events.count(), [db]);
  return count === undefined ? undefined : count > 0;
}
