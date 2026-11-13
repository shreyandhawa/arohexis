import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { checkin as copy } from '../../copy/checkin';
import {
  CHECKIN_ATTRIBUTION,
  CHECKIN_ITEMS,
  CHECKIN_SCALE_LABELS,
  CHECKIN_STEM,
  type CheckinAnswers,
} from '../../domain/checkin';
import { skipCheckin, submitCheckin } from '../actions/checkin';
import { Button } from '../components/Button';
import { useData } from '../data/DataProvider';
import { useCheckinDue } from '../hooks/useCheckinDue';
import shell from '../layout/Shell.module.css';
import styles from './Checkin.module.css';

const POINTS = [1, 2, 3, 4, 5, 6, 7] as const;

export function Checkin() {
  const deps = useData();
  const navigate = useNavigate();
  const due = useCheckinDue();
  const busy = useRef(false);
  const [answers, setAnswers] = useState<(number | undefined)[]>([
    undefined,
    undefined,
    undefined,
    undefined,
  ]);
  const [failed, setFailed] = useState(false);
  const complete = answers.every((a) => a !== undefined);

  async function run(action: () => Promise<void>, to: string) {
    if (busy.current) return;
    busy.current = true;
    setFailed(false);
    try {
      await action();
      void navigate(to);
    } catch (error) {
      console.error(error);
      busy.current = false;
      setFailed(true);
    }
  }

  function onSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!complete) return;
    void run(() => submitCheckin(deps, answers as CheckinAnswers), '/insights');
  }

  return (
    <form className={styles['screen']} onSubmit={onSubmit}>
      <h1 className={shell['title']}>{copy.title}</h1>
      <p>{copy.intro}</p>
      {CHECKIN_ITEMS.map((item, i) => (
        <fieldset key={item} className={styles['group']}>
          <legend className={styles['legend']}>
            <span className={styles['stem']}>{CHECKIN_STEM}</span>
            {item}
          </legend>
          <div className={styles['scale']}>
            {POINTS.map((n) => (
              <label key={n} className={styles['option']}>
                <input
                  type="radio"
                  name={`item-${i}`}
                  value={n}
                  className={styles['radio']}
                  checked={answers[i] === n}
                  aria-label={copy.scale(n)}
                  onChange={() => setAnswers((prev) => prev.map((a, j) => (j === i ? n : a)))}
                />
                <span aria-hidden="true">{n}</span>
              </label>
            ))}
          </div>
          <div className={styles['ends']} aria-hidden="true">
            <span>{CHECKIN_SCALE_LABELS.low}</span>
            <span>{CHECKIN_SCALE_LABELS.high}</span>
          </div>
        </fieldset>
      ))}
      <div className={styles['actions']}>
        <Button type="submit" disabled={!complete}>
          {copy.submit}
        </Button>
        <Button variant="quiet" onClick={() => void run(() => skipCheckin(deps), '/')}>
          {copy.skip}
        </Button>
        <p aria-live="polite" className={styles['error']}>
          {failed ? copy.saveFailed : ''}
        </p>
      </div>
      <p className={shell['muted']}>{CHECKIN_ATTRIBUTION}</p>
      {due?.nudgeBackup && (
        <Link to="/settings/data" className={shell['link']}>
          {copy.backUp}
        </Link>
      )}
    </form>
  );
}
