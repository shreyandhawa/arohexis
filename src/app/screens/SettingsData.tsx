import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { parseExportText, type ExportData, type ExportFile } from '../../domain/exportFormat';
import { data as copy, lastBackup } from '../../copy/data';
import { demo } from '../../copy/demo';
import { browserSharer, daysSinceBackup, exportBackup, loadBackupData } from '../actions/backup';
import { enterDemo } from '../actions/demo';
import { Button } from '../components/Button';
import { useData } from '../data/DataProvider';
import { useConfig } from '../hooks/useConfig';
import { useNow } from '../hooks/useNow';
import shell from '../layout/Shell.module.css';
import { DeleteConfirm, ImportPreview } from './DataPanels';
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

  /** Resolves true once the backup has been handed off. */
  async function onExport(): Promise<boolean> {
    if (busy) return false;
    if (loadFailed) {
      // The button doubles as the retry: load again, then a second tap exports.
      setAttempt((n) => n + 1);
      return false;
    }
    if (!data) return false;
    setBusy(true);
    setFailed(false);
    try {
      await exportBackup(deps, browserSharer(), data);
      return true;
    } catch (error) {
      console.error(error);
      setFailed(true);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const [persisted, setPersisted] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    void navigator.storage?.persisted?.().then(setPersisted, () => undefined);
  }, []);

  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<ExportFile | undefined>(undefined);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [demoFailed, setDemoFailed] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setMessage(undefined);
    let parsed;
    try {
      parsed = parseExportText(await file.text());
    } catch (error) {
      console.error(error);
      setMessage(copy.importFailed);
      return;
    }
    if (parsed.ok) setPending(parsed.file);
    else setMessage(parsed.message);
  }

  function close(done?: string) {
    setPending(undefined);
    setDeleting(false);
    setMessage(done);
  }

  async function onDemo() {
    setDemoFailed(false);
    try {
      await enterDemo(deps);
      window.location.assign('/');
    } catch (error) {
      console.error(error);
      setDemoFailed(true);
    }
  }

  const flow = {
    exportFirst: onExport,
    exportDisabled: busy || loaded === undefined,
    onClose: close,
  };

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
      {deps.mode === 'demo' && <p className={shell['muted']}>{copy.demoNote}</p>}
      {persisted !== undefined && (
        <p className={shell['muted']}>{persisted ? copy.persisted : copy.notPersisted}</p>
      )}
      {pending ? (
        <ImportPreview file={pending} {...flow} />
      ) : deleting ? (
        <DeleteConfirm {...flow} />
      ) : (
        <>
          <Button variant="quiet" onClick={() => fileInput.current?.click()}>
            {copy.importButton}
          </Button>
          <Button variant="quiet" onClick={() => setDeleting(true)}>
            {copy.deleteButton}
          </Button>
          {deps.mode === 'main' && (
            <Button variant="quiet" onClick={() => void onDemo()}>
              {copy.exploreDemo}
            </Button>
          )}
        </>
      )}
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className={styles['hiddenInput']}
        aria-label={copy.importButton}
        tabIndex={-1}
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <div aria-live="polite">
        {message && <p className={shell['muted']}>{message}</p>}
        {demoFailed && <p className={styles['error']}>{demo.failed}</p>}
      </div>
    </section>
  );
}
