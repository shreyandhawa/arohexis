import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { lapse, planDue } from '../../copy/plans';
import type { Plan } from '../../domain/config';
import { formatPlanTime, type Occurrence } from '../../domain/plans';
import { startPlan } from '../actions/lapse';
import { Button } from '../components/Button';
import { useData } from '../data/DataProvider';
import { useConfig } from '../hooks/useConfig';
import styles from './PlanDueCard.module.css';

export function capitalFirst(text: string): string {
  const t = text.trim().replace(/[.]+$/, '');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Spec §8.6: "9:00 · at my desk", then "Open the essay doc". */
export function PlanDueCard({ plan, occurrence }: { plan: Plan; occurrence: Occurrence }) {
  const deps = useData();
  const navigate = useNavigate();
  const config = useConfig();
  const busy = useRef(false);
  const [failed, setFailed] = useState(false);
  const place = plan.place.trim();
  const when = place ? `${formatPlanTime(plan.time)} · at ${place}` : formatPlanTime(plan.time);

  async function onStart() {
    if (busy.current || !config) return;
    busy.current = true;
    setFailed(false);
    try {
      const id = await startPlan(deps, plan, config.parts, occurrence.date);
      void navigate(`/started/${id}`);
    } catch (error) {
      console.error(error);
      busy.current = false;
      setFailed(true);
    }
  }

  return (
    <section aria-labelledby="plan-due-title" className={styles['card']}>
      <h2 id="plan-due-title" className="visually-hidden">
        {planDue.region}
      </h2>
      <p className={styles['when']}>{when}</p>
      <p className={styles['action']}>{capitalFirst(plan.firstAction)}</p>
      <div className={styles['buttons']}>
        <Button className={styles['start']} onClick={() => void onStart()}>
          {planDue.startNow}
        </Button>
        <Button
          variant="quiet"
          className={styles['stuck']}
          onClick={() =>
            void navigate('/stuck', { state: { planId: plan.id, occurrence: occurrence.date } })
          }
        >
          {planDue.stuckOnThis}
        </Button>
      </div>
      <p aria-live="polite" className={styles['error']}>
        {failed ? lapse.failed : ''}
      </p>
    </section>
  );
}
