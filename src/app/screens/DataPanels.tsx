import { useEffect, useRef, useState, type ReactNode } from 'react';
import { data as copy, importPreview } from '../../copy/data';
import type { ExportFile } from '../../domain/exportFormat';
import { summarizeExport } from '../../domain/exportFormat';
import { replaceAllData } from '../../storage/importData';
import { deleteEverything } from '../actions/dataReset';
import { Button } from '../components/Button';
import { useData } from '../data/DataProvider';
import shell from '../layout/Shell.module.css';
import styles from './SettingsData.module.css';

type PanelProps = {
  title: string;
  children: ReactNode;
};

/** An inline confirmation. Focus moves to its heading when it opens. */
function Panel({ title, children }: PanelProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <section className={styles['panel']} aria-labelledby="data-panel-title">
      <h2 id="data-panel-title" tabIndex={-1} ref={heading} className={shell['subtitle']}>
        {title}
      </h2>
      {children}
    </section>
  );
}

type FlowProps = {
  /** Saves a backup of the current data. Resolves when it is done. */
  exportFirst: () => Promise<boolean>;
  exportDisabled: boolean;
  onClose: (message?: string) => void;
};

function ExportFirst({ exportFirst, exportDisabled }: Omit<FlowProps, 'onClose'>) {
  const [done, setDone] = useState(false);
  return (
    <>
      <Button
        variant="quiet"
        disabled={exportDisabled}
        onClick={() => void exportFirst().then(setDone)}
      >
        {copy.exportFirst}
      </Button>
      <div aria-live="polite">{done && <p className={shell['muted']}>{copy.exportedFirst}</p>}</div>
    </>
  );
}

export function ImportPreview({ file, ...flow }: FlowProps & { file: ExportFile }) {
  const { db } = useData();
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onReplace() {
    setBusy(true);
    setFailed(false);
    try {
      await replaceAllData(db, file.data);
      flow.onClose(copy.importDone);
    } catch (error) {
      console.error(error);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title={copy.importTitle}>
      <p>{importPreview(summarizeExport(file))}</p>
      <p className={shell['muted']}>{copy.importReplaces}</p>
      <ExportFirst exportFirst={flow.exportFirst} exportDisabled={flow.exportDisabled} />
      <Button disabled={busy} onClick={() => void onReplace()}>
        {copy.importConfirm}
      </Button>
      <Button variant="quiet" onClick={() => flow.onClose()}>
        {copy.cancel}
      </Button>
      <div aria-live="polite">
        {failed && <p className={styles['error']}>{copy.importFailed}</p>}
      </div>
    </Panel>
  );
}

export function DeleteConfirm(flow: FlowProps) {
  const { db } = useData();
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    setBusy(true);
    setFailed(false);
    try {
      await deleteEverything(db);
      flow.onClose(copy.deleteDone);
    } catch (error) {
      console.error(error);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title={copy.deleteTitle}>
      <p>{copy.deleteBody}</p>
      <ExportFirst exportFirst={flow.exportFirst} exportDisabled={flow.exportDisabled} />
      <Button disabled={busy} onClick={() => void onDelete()}>
        {copy.deleteConfirm}
      </Button>
      <Button variant="quiet" onClick={() => flow.onClose()}>
        {copy.cancel}
      </Button>
      <div aria-live="polite">
        {failed && <p className={styles['error']}>{copy.deleteFailed}</p>}
      </div>
    </Panel>
  );
}
