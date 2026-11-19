import { brain } from '../../copy/brain';
import { planWords } from '../../copy/plans';
import { planSentence } from '../../domain/plans';
import { useData } from '../data/DataProvider';
import { useBrainSpace } from '../hooks/useBrainSpace';
import { useConfig } from '../hooks/useConfig';
import styles from './PartCard.module.css';

export const LINE_CARD_TITLE_ID = 'line-card-title';

/** One line's card: its part, how many starts it holds, and since when. Opens from a tap or the text list. */
export default function LineCard({ lineId }: { lineId: string }) {
  const { clock } = useData();
  const data = useBrainSpace();
  const config = useConfig();
  const line = data?.space.lines.find((l) => l.id === lineId);
  if (!data || !config || !line) return <div />;
  const part = data.parts.find((p) => p.id === line.partId);
  const plan = line.kind === 'plan' ? config.plans.find((p) => p.id === line.planId) : undefined;
  const since = line.kind === 'start' ? line.at : plan?.createdAt;
  const date =
    since === undefined
      ? undefined
      : new Intl.DateTimeFormat('en-US', {
          month: 'long',
          day: 'numeric',
          timeZone: clock.timeZone(),
        }).format(since);
  return (
    <div className={styles['card']}>
      <h2 id={LINE_CARD_TITLE_ID} className={styles['heading']}>
        {part && <span aria-hidden="true" className={styles['swatch']} data-colour={part.colour} />}
        {part?.label ?? brain.noPart}
      </h2>
      <p className={styles['count']}>{brain.starts(line.kind === 'plan' ? line.onCueStarts : 1)}</p>
      {date && <p className={styles['count']}>{brain.line.since(date)}</p>}
      {line.kind === 'plan' && (
        <>
          {plan && <p className={styles['count']}>{planSentence(plan, 'full', planWords)}</p>}
          <p className={styles['count']}>{brain.strength[line.strength]}</p>
        </>
      )}
    </div>
  );
}
