import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { foldAttempts, isCountedStart } from '../../domain/attempts';
import { EARLY_DAYS_BELOW, responseStats } from '../../domain/metrics';
import { smallerLadder } from '../../copy/smaller';
import { actionFailed, response as copy } from '../../copy/stuck';
import { notNow, start } from '../actions/stuck';
import { Button } from '../components/Button';
import { useData } from '../data/DataProvider';
import { useAttempt } from '../hooks/useAttempt';
import { isTyping } from '../typing';
import { useConfig } from '../hooks/useConfig';
import styles from './ResponseScreen.module.css';

export function ResponseScreen() {
  const { attemptId = '' } = useParams();
  const deps = useData();
  const navigate = useNavigate();
  const attempt = useAttempt(attemptId);
  const config = useConfig();
  const busy = useRef(false);
  const [disabled, setDisabled] = useState(false);
  const [failed, setFailed] = useState(false);
  // How many "Smaller still" taps so far. Not recorded; it only swaps the text.
  const [smaller, setSmaller] = useState(0);
  const stat = useLiveQuery(
    async () =>
      responseStats(foldAttempts(await deps.events.list())).find(
        (s) => s.responseId === attempt?.response?.id,
      ) ?? null,
    [deps.events, attempt?.response?.id],
  );
  const ladder = smallerLadder(attempt?.feeling?.id);

  const begin = attempt && !isCountedStart(attempt) && !attempt.dismissed;

  async function onStart() {
    // Disable before awaiting so a double tap cannot make two starts.
    if (busy.current) return;
    busy.current = true;
    setDisabled(true);
    setFailed(false);
    try {
      await start(deps, attemptId);
      void navigate(`/started/${attemptId}`, { replace: true });
    } catch (error) {
      console.error(error);
      busy.current = false;
      setDisabled(false);
      setFailed(true);
    }
  }

  async function onNotNow() {
    if (busy.current) return;
    busy.current = true;
    setDisabled(true);
    setFailed(false);
    try {
      await notNow(deps, attemptId);
    } catch (error) {
      console.error(error);
      busy.current = false;
      setDisabled(false);
      setFailed(true);
      return;
    }
    void navigate('/', { replace: true, state: { notice: 'not-now' } });
  }

  useEffect(() => {
    // The last step is on screen and its button is gone: hand focus to Start.
    if (smaller > 0 && smaller >= ladder.length) {
      document.querySelector<HTMLElement>('[data-action="start"]')?.focus();
    }
  }, [smaller, ladder.length]);

  useEffect(() => {
    if (!begin) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat || isTyping(event.target)) return;
      // Spec §8: Esc dismisses, the same as Not now.
      if (event.key === 'Escape') {
        void onNotNow();
        return;
      }
      if (event.key !== 'Enter') return;
      // A focused control handles Enter itself.
      if (event.target instanceof Element && event.target.closest('button, a, input')) return;
      void onStart();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [begin]);

  if (attempt === undefined) return null;
  if (attempt === null || attempt.dismissed || !attempt.response) {
    return disabled ? null : <Navigate to="/" replace />;
  }
  if (isCountedStart(attempt)) return <Navigate to={`/started/${attemptId}`} replace />;

  const body = config?.responses.find((r) => r.id === attempt.response?.id)?.body;

  return (
    <section className={styles['screen']}>
      <div aria-live="polite" className={styles['advice']}>
        <p className={styles['body']}>{smaller > 0 ? ladder[smaller - 1] : body}</p>
        {smaller === 0 && stat && stat.shown >= EARLY_DAYS_BELOW && stat.ledToStart > 0 && (
          <p className={styles['learned']}>{copy.ledToStart(stat.ledToStart, stat.shown)}</p>
        )}
      </div>
      <h1 className={styles['firstStep']}>{copy.firstStep}</h1>
      <div className={styles['actions']}>
        <p aria-live="polite" className={styles['error']}>
          {failed ? actionFailed : ''}
        </p>
        <Button
          variant="primary"
          data-action="start"
          disabled={disabled}
          onClick={() => void onStart()}
        >
          {copy.start}
        </Button>
        {smaller < ladder.length && (
          <Button variant="quiet" disabled={disabled} onClick={() => setSmaller(smaller + 1)}>
            {copy.smallerStill}
          </Button>
        )}
        <Button variant="quiet" disabled={disabled} onClick={() => void onNotNow()}>
          {copy.notNow}
        </Button>
      </div>
    </section>
  );
}
