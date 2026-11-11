import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { actionFailed, feeling as copy } from '../../copy/stuck';
import { beginStuck, chooseFeeling, notNow } from '../actions/stuck';
import { Button } from '../components/Button';
import { useData } from '../data/DataProvider';
import { useConfig } from '../hooks/useConfig';
import styles from './Feeling.module.css';

function isTyping(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('input, textarea, select') !== null;
}

export function Feeling() {
  const deps = useData();
  const navigate = useNavigate();
  const config = useConfig();
  const opening = useRef<Promise<string | undefined> | null>(null);
  const picking = useRef(false);
  const [attemptId, setAttemptId] = useState<string>();
  const [failed, setFailed] = useState(false);

  // One attempt per mount, however often this re-renders.
  useEffect(() => {
    if (opening.current) return;
    const opened = beginStuck(deps).catch(() => undefined);
    opening.current = opened;
    void opened.then((id) => (id ? setAttemptId(id) : setFailed(true)));
  }, [deps]);

  const feelings = (config?.feelings ?? [])
    .filter((f) => f.enabled)
    .sort((a, b) => a.order - b.order);
  const ready = attemptId !== undefined && config !== undefined;

  async function pick(feelingId: string) {
    if (!attemptId || picking.current) return;
    picking.current = true;
    setFailed(false);
    try {
      await chooseFeeling(deps, attemptId, feelingId);
      void navigate(`/stuck/${attemptId}`, { replace: true });
    } catch {
      picking.current = false;
      setFailed(true);
    }
  }

  async function back() {
    if (picking.current) return;
    picking.current = true;
    setFailed(false);
    try {
      const id = await opening.current;
      // No attempt exists when opening failed, so there is nothing to dismiss.
      if (id) await notNow(deps, id);
    } catch {
      picking.current = false;
      setFailed(true);
      return;
    }
    void navigate('/', { replace: true });
  }

  useEffect(() => {
    if (!ready) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey)
        return;
      if (isTyping(event.target) || !/^[1-9]$/.test(event.key)) return;
      const chosen = feelings[Number(event.key) - 1];
      if (chosen) void pick(chosen.id);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [ready, feelings.map((f) => f.id).join()]);

  return (
    <section className={styles['screen']}>
      <h1 className={styles['heading']}>{copy.heading}</h1>
      <div className={styles['list']}>
        {feelings.map((f) => (
          <button
            key={f.id}
            type="button"
            className={styles['feeling']}
            disabled={!ready}
            onClick={() => void pick(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <p aria-live="polite" className={styles['error']}>
        {failed ? actionFailed : ''}
      </p>
      <Button variant="quiet" className={styles['back']} onClick={() => void back()}>
        {copy.back}
      </Button>
    </section>
  );
}
