import { useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { isCountedStart } from '../../domain/attempts';
import { isUndoProminent, timerState } from '../../domain/timer';
import { startsThisWeek } from '../../copy/home';
import { actionFailed, started as copy } from '../../copy/stuck';
import { finishTimer, tag, undo } from '../actions/stuck';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { useData } from '../data/DataProvider';
import { useAttempt } from '../hooks/useAttempt';
import { useConfig } from '../hooks/useConfig';
import { useNow } from '../hooks/useNow';
import { useStartsThisWeek } from '../hooks/useStartsThisWeek';
import { PlateBoundary } from '../plate/PlateBoundary';
import { Strip } from '../plate/Strip';
import styles from './Started.module.css';

const TICK_MS = 250;
const WARNING_SEC = 60;

function formatClock(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function Started() {
  const { attemptId = '' } = useParams();
  const deps = useData();
  const navigate = useNavigate();
  const attempt = useAttempt(attemptId);
  const config = useConfig();
  const now = useNow(TICK_MS);
  const weekCount = useStartsThisWeek();
  const leaving = useRef(false);
  const [leavingNow, setLeavingNow] = useState(false);
  const [failed, setFailed] = useState(false);

  if (attempt === undefined) return null;
  if (!attempt || !attempt.start || !isCountedStart(attempt)) {
    return leavingNow ? null : <Navigate to="/" replace />;
  }

  const startAt = attempt.start.at;
  const { remainingSec, done } = timerState(startAt, now);
  const parts = (config?.parts ?? []).filter((p) => p.enabled).sort((a, b) => a.order - b.order);

  // Spoken announcements change only at one minute left and at zero.
  const status = done ? copy.timerDone : remainingSec <= WARNING_SEC ? copy.oneMinuteLeft : '';

  async function leave(action: () => Promise<void>, notice?: 'start-removed') {
    if (leaving.current) return;
    leaving.current = true;
    setLeavingNow(true);
    setFailed(false);
    try {
      await action();
    } catch (error) {
      console.error(error);
      leaving.current = false;
      setLeavingNow(false);
      setFailed(true);
      return;
    }
    void navigate('/', { replace: true, ...(notice && { state: { notice } }) });
  }

  async function onTag(partId: string) {
    setFailed(false);
    try {
      await tag(deps, attemptId, partId);
    } catch (error) {
      console.error(error);
      setFailed(true);
    }
  }

  const stop = () => void leave(() => finishTimer(deps, attemptId, 'stopped'));
  const removeStart = () => void leave(() => undo(deps, attemptId), 'start-removed');

  return (
    <section className={styles['screen']}>
      <div className={styles['reward']} data-testid="reward">
        <h1 className={styles['title']}>{copy.title}</h1>
        <p className={styles['line']}>{copy.encouragement}</p>
        {weekCount > 0 && <p className={styles['muted']}>{startsThisWeek(weekCount)}</p>}
      </div>

      <div className={styles['timerBlock']}>
        <p className={`numeric ${styles['timer']}`} data-testid="timer">
          {formatClock(remainingSec)}
        </p>
        <div aria-live="polite" className={styles['status']}>
          {status && <p className={done ? styles['done'] : styles['srOnly']}>{status}</p>}
          {failed && <p className={styles['error']}>{actionFailed}</p>}
        </div>
      </div>

      <div className={styles['tags']}>
        <h2 className={styles['tagsTitle']}>{copy.tagsTitle}</h2>
        <div className={styles['chips']}>
          {parts.map((p) => (
            <Chip key={p.id} pressed={attempt.part?.id === p.id} onClick={() => void onTag(p.id)}>
              {p.label}
            </Chip>
          ))}
        </div>
      </div>

      <PlateBoundary>
        <Strip attempt={attempt} />
      </PlateBoundary>

      <div className={styles['actions']}>
        {done && (
          <Button
            variant="quiet"
            onClick={() => void leave(() => finishTimer(deps, attemptId, 'kept-going'))}
          >
            {copy.keepGoing}
          </Button>
        )}
        <Button variant="quiet" onClick={stop}>
          {copy.doneForNow}
        </Button>
        {done && <p className={styles['muted']}>{copy.either}</p>}
        {isUndoProminent(startAt, now) ? (
          <Button variant="quiet" onClick={removeStart}>
            {copy.undo}
          </Button>
        ) : (
          <button type="button" className={styles['remove']} onClick={removeStart}>
            {copy.remove}
          </button>
        )}
      </div>
    </section>
  );
}
