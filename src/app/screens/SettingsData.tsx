import { useState } from 'react';
import { data as copy, lastBackup } from '../../copy/data';
import { browserSharer, daysSinceBackup, exportBackup } from '../actions/backup';
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

  async function onExport() {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      await exportBackup(deps, browserSharer());
    } catch {
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
      <Button onClick={() => void onExport()} disabled={busy}>
        {copy.exportButton}
      </Button>
      <p className={shell['muted']}>{config ? lastBackup(days) : ''}</p>
      <div aria-live="polite">
        {failed && <p className={styles['error']}>{copy.exportFailed}</p>}
      </div>
    </section>
  );
}
