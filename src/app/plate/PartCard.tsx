import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { brain } from '../../copy/brain';
import type { BrainLine } from '../../domain/brainSpace';
import { focusFor, recentLapses } from '../../domain/focus';
import {
  dayWord,
  formatPlanTime,
  nextOccurrence,
  openOccurrence,
  planSentence,
} from '../../domain/plans';
import { startPlan } from '../actions/lapse';
import { Button } from '../components/Button';
import { lapse, planWords } from '../../copy/plans';
import { useData } from '../data/DataProvider';
import { useBrainSpace } from '../hooks/useBrainSpace';
import { useConfig } from '../hooks/useConfig';
import styles from './PartCard.module.css';

export const PART_CARD_TITLE_ID = 'part-card-title';

type PlanLine = Extract<BrainLine, { kind: 'plan' }>;

export function PartCard({ partId, onClose }: { partId: string; onClose(): void }) {
  const deps = useData();
  const { events, clock } = deps;
  const navigate = useNavigate();
  const busy = useRef(false);
  const [failed, setFailed] = useState(false);
  const data = useBrainSpace();
  const config = useConfig();
  const all = useLiveQuery(() => events.list(), [events]);
  if (!data || !config || !all) return <div />;

  const part = data.parts.find((p) => p.id === partId);
  const light = data.space.parts.find((p) => p.partId === partId);
  const planLines = data.space.lines.filter(
    (l): l is PlanLine => l.kind === 'plan' && !l.hidden && l.partId === partId,
  );
  const rule = focusFor({
    partId,
    plans: config.plans,
    lines: data.space.lines,
    lapsedPlanIds: recentLapses(all, clock.now()),
    plansAvailable: true,
  });

  const now = clock.now();
  const tz = clock.timeZone();
  const plans = config.plans
    .filter((p) => p.partId === partId)
    .sort((a, b) => a.createdAt - b.createdAt);

  async function startNow(planId: string, date: string) {
    const plan = plans.find((p) => p.id === planId);
    if (!plan || busy.current || !config) return;
    busy.current = true;
    setFailed(false);
    try {
      const id = await startPlan(deps, plan, config.parts, date);
      void navigate(`/started/${id}`);
    } catch (error) {
      console.error(error);
      busy.current = false;
      setFailed(true);
    }
  }

  return (
    <div className={styles['card']}>
      <h2 id={PART_CARD_TITLE_ID} className={styles['heading']}>
        {part && <span aria-hidden="true" className={styles['swatch']} data-colour={part.colour} />}
        {part?.label ?? brain.noPart}
      </h2>
      <p className={styles['count']}>{brain.starts(light?.starts ?? 0)}</p>
      <ul className={styles['lines']}>
        {planLines.map((l) => (
          <li key={l.id}>{`${brain.strength[l.strength]} · ${brain.onCue(l.onCueStarts)}`}</li>
        ))}
        {light && light.startLines > 0 && <li>{brain.startLines(light.startLines)}</li>}
      </ul>
      {plans.length > 0 && (
        <section aria-labelledby="part-card-plans" className={styles['focus']}>
          <h3 id="part-card-plans" className={styles['focusTitle']}>
            {brain.card.plansTitle}
          </h3>
          <ul className={styles['lines']}>
            {plans.map((p) => {
              const open = p.active ? openOccurrence(p, all, now, tz) : undefined;
              const next = p.active && !open ? nextOccurrence(p, all, now, tz) : undefined;
              return (
                <li key={p.id} className={styles['plan']}>
                  <span>{planSentence(p, 'full', planWords)}</span>
                  {open && (
                    <Button
                      variant="quiet"
                      className={styles['startNow']}
                      onClick={() => void startNow(p.id, open.date)}
                    >
                      {brain.card.startNow}
                    </Button>
                  )}
                  {next && (
                    <span className={styles['next']}>
                      {brain.card.next(
                        formatPlanTime(p.time),
                        dayWord(next.at, now, tz, planWords),
                      )}
                    </span>
                  )}
                  {!p.active && <span className={styles['next']}>{brain.card.paused}</span>}
                </li>
              );
            })}
          </ul>
          <p aria-live="polite" className={styles['count']}>
            {failed ? lapse.failed : ''}
          </p>
        </section>
      )}
      <section aria-labelledby="part-card-focus" className={styles['focus']}>
        <h3 id="part-card-focus" className={styles['focusTitle']}>
          {brain.card.focusTitle}
        </h3>
        <p className={styles['count']}>{brain.card.focus[rule]}</p>
        <Link to="/about#brain-space" className={styles['link']} onClick={onClose}>
          {brain.card.aboutLink}
        </Link>
      </section>
    </div>
  );
}
