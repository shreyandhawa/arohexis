import { hourLabel, insights } from '../../copy/insights';
import { HiddenTable } from './HiddenTable';
import styles from './Charts.module.css';

const CELL = 12.5;

/** 24 cells, one per local hour; a cell's depth shows its share of the busiest hour. */
export function HourStrip({ hours, summary }: { hours: readonly number[]; summary: string }) {
  const max = Math.max(1, ...hours);
  return (
    <figure className={styles['chart']}>
      <svg viewBox={`0 0 ${CELL * 24} 28`} className={styles['svg']} aria-hidden="true">
        {hours.map((n, h) => (
          <rect
            key={h}
            x={h * CELL}
            y="0"
            width={CELL}
            height="28"
            className={styles['cell']}
            fillOpacity={n === 0 ? 0 : 0.2 + 0.8 * (n / max)}
          />
        ))}
      </svg>
      <ul className={styles['scale']} aria-hidden="true">
        {insights.hourScale.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      <figcaption className={styles['summary']}>{summary}</figcaption>
      <HiddenTable
        caption={insights.hoursTitle}
        head={[insights.table.hour, insights.table.starts]}
        rows={hours.map((n, h) => [hourLabel(h), n])}
      />
    </figure>
  );
}
