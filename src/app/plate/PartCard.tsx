import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { brain } from '../../copy/brain';
import type { BrainLine } from '../../domain/brainSpace';
import { focusFor, recentLapses } from '../../domain/focus';
import { useData } from '../data/DataProvider';
import { useBrainSpace } from '../hooks/useBrainSpace';
import { useConfig } from '../hooks/useConfig';
import styles from './PartCard.module.css';

export const PART_CARD_TITLE_ID = 'part-card-title';

type PlanLine = Extract<BrainLine, { kind: 'plan' }>;

export function PartCard({ partId, onClose }: { partId: string; onClose(): void }) {
  const { events, clock } = useData();
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
    plansAvailable: false,
  });

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
