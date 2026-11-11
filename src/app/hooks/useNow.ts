import { useEffect, useState } from 'react';
import { useData } from '../data/DataProvider';

/** The current time in ms, refreshed every intervalMs. */
export function useNow(intervalMs: number): number {
  const { clock } = useData();
  const [now, setNow] = useState(() => clock.now());
  useEffect(() => {
    const id = setInterval(() => setNow(clock.now()), intervalMs);
    return () => clearInterval(id);
  }, [clock, intervalMs]);
  return now;
}
