import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { ConfigStore, Clock, EventStore, IdGen } from '../../domain/ports';
import { createConfigStore } from '../../storage/configStore';
import type { ArohexisDB } from '../../storage/db';
import { createEventStore } from '../../storage/eventStore';
import { openStorage } from '../../storage/open';
import { StorageError } from '../screens/StorageError';
import { browserClock, browserIds } from './runtime';

export type AppDeps = {
  events: EventStore;
  config: ConfigStore;
  clock: Clock;
  ids: IdGen;
  db: ArohexisDB;
  persist: () => Promise<boolean>;
};

const DataContext = createContext<AppDeps | undefined>(undefined);

function persist(): Promise<boolean> {
  return navigator.storage?.persist?.() ?? Promise.resolve(false);
}

type State = { status: 'opening' } | { status: 'failed' } | { status: 'ready'; deps: AppDeps };

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: 'opening' });

  useEffect(() => {
    let cancelled = false;
    let opened: ArohexisDB | undefined;
    void openStorage('arohexis').then((result) => {
      if (!result.ok) {
        if (!cancelled) setState({ status: 'failed' });
        return;
      }
      if (cancelled) {
        result.db.close();
        return;
      }
      opened = result.db;
      setState({
        status: 'ready',
        deps: {
          db: result.db,
          events: createEventStore(result.db),
          config: createConfigStore(result.db),
          clock: browserClock,
          ids: browserIds,
          persist,
        },
      });
    });
    return () => {
      cancelled = true;
      opened?.close();
    };
  }, []);

  if (state.status === 'failed') return <StorageError />;
  if (state.status === 'opening') return null;
  return <DataContext value={state.deps}>{children}</DataContext>;
}

export function useData(): AppDeps {
  const deps = useContext(DataContext);
  if (!deps) throw new Error('useData must be used inside DataProvider');
  return deps;
}
