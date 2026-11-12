import { useLiveQuery } from 'dexie-react-hooks';
import type { Config } from '../../domain/config';
import { useData } from '../data/DataProvider';

/** The live configuration, or undefined until the first read finishes. */
export function useConfig(): Config | undefined {
  const { config } = useData();
  return useLiveQuery(() => config.getConfig(), [config]);
}
