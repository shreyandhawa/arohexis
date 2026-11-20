import { useState } from 'react';
import { Link } from 'react-router';
import { firstPlan as copy, plans } from '../../copy/plans';
import { Button } from '../components/Button';
import { useData } from '../data/DataProvider';
import shell from '../layout/Shell.module.css';
import styles from './PlanNudgeCard.module.css';

/** Home's one quiet offer of a first plan. "Not now" dismisses it for good. */
export function PlanNudgeCard() {
  const { config } = useData();
  const [failed, setFailed] = useState(false);

  function dismiss() {
    setFailed(false);
    config.applyConfigPatch({ settings: { planNudgeDismissed: true } }).catch((error: unknown) => {
      console.error(error);
      setFailed(true);
    });
  }

  return (
    <section aria-labelledby="plan-nudge-title" className={styles['card']}>
      <h2 id="plan-nudge-title" className="visually-hidden">
        {copy.region}
      </h2>
      <p className={styles['text']}>{copy.intro}</p>
      <div className={styles['actions']}>
        <Link to="/plans/new" state={{ firstRun: true }} className={styles['action']}>
          {copy.action}
        </Link>
        <Button variant="quiet" className={styles['dismiss']} onClick={dismiss}>
          {copy.notNow}
        </Button>
      </div>
      {failed && <p className={shell['muted']}>{plans.saveFailed}</p>}
    </section>
  );
}
