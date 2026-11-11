import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import type { ExportData } from '../../domain/exportFormat';
import { data as copy, lastBackup } from '../../copy/data';
import { browserSharer, daysSinceBackup, exportBackup, loadBackupData } from '../actions/backup';
import { Button } from '../components/Button';
import { useData } from '../data/DataProvider';
import { useConfig } from '../hooks/useConfig';
import { useNow } from '../hooks/useNow';
import shell from '../layout/Shell.module.css';
import styles from './SettingsData.module.css';

const MINUTE_MS = 60_000;

export function SettingsData() {
  const deps = useData();
  const config = useConfig();
  const now = useNow(MINUTE_MS);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  // Loaded while the screen is open so the tap can share synchronously (WebKit's
  // transient activation does not reliably survive an IndexedDB round trip).
  // A failed load is returned, not thrown, so the screen can say so and retry it.
  const [attempt, setAttempt] = useState(0);
  const loaded = useLiveQuery(async (): Promise<{ data: ExportData } | { error: unknown }> => {
    try {
      return { data: await loadBackupData(deps) };
    } catch (error) {
      return { error };
    }
  }, [deps, attempt]);
  const data = loaded && 'data' in loaded ? loaded.data : undefined;
  const loadError = loaded && 'error' in loaded ? loaded.error : undefined;
  const loadFailed = loaded !== undefined && 'error' in loaded;

  useEffect(() => {
    if (loadFailed) console.error(loadError);
  }, [loadFailed, loadError]);

  async function onExport() {
    if (busy) return;
    if (loadFailed) {
      // The button doubles as the retry: load again, then a second tap exports.
      setAttempt((n) => n + 1);
      return;
    }
    if (!data) return;
    setBusy(true);
    setFailed(false);
    try {
      await exportBackup(deps, browserSharer(), data);
    } catch (error) {
      console.error(error);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const days = daysSinceBackup(config?.settings.lastExportAt, now, deps.clock.timeZone());

  return (
    <section className={styles['screen']}>
      <h1 className={shell['title']}>{copy.title}</h1>
      <p>{copy.explainer}</p>
      <Button onClick={() => void onExport()} disabled={busy || loaded === undefined}>
        {copy.exportButton}
      </Button>
      <p className={shell['muted']}>{config ? lastBackup(days) : ''}</p>
      <div aria-live="polite">
        {(failed || loadFailed) && <p className={styles['error']}>{copy.exportFailed}</p>}
      </div>
    </section>
  );
}
