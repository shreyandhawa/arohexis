import { useEffect, useState } from 'react';
import { useData } from '../data/DataProvider';

/** The current time in ms, refreshed every intervalMs. */
export function useNow(intervalMs: number): number {
  const { clock } = useData();
  const [now, setNow] = useState(() => clock.now());
  useEffect(() => {
    const id = setInterval(() => setNow(clock.now()), intervalMs);
    // A locked or backgrounded phone throttles timers; catch up on return.
    const refresh = () => setNow(clock.now());
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [clock, intervalMs]);
  return now;
}
