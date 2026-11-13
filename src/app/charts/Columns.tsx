import { insights } from '../../copy/insights';
import { HiddenTable } from './HiddenTable';
import styles from './Charts.module.css';

export type Column = { key: string; value: number };

const W = 300;
const H = 100;

/** One column per entry; the last one (this week) is highlighted. No goal line. */
export function Columns({ data, summary }: { data: readonly Column[]; summary: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const slot = W / Math.max(1, data.length);
  const width = Math.min(slot * 0.7, 24);
  return (
    <figure className={styles['chart']}>
      <svg viewBox={`0 0 ${W} ${H + 2}`} className={styles['svg']} aria-hidden="true">
        <line x1="0" x2={W} y1={H + 1} y2={H + 1} className={styles['axis']} />
        {data.map((d, i) => {
          const h = (d.value / max) * H;
          const last = i === data.length - 1;
          return (
            <rect
              key={d.key}
              x={i * slot + (slot - width) / 2}
              y={H - h}
              width={width}
              height={h}
              className={last ? styles['current'] : styles['bar']}
            />
          );
        })}
      </svg>
      <figcaption className={styles['summary']}>{summary}</figcaption>
      <HiddenTable
        caption={insights.weeksTitle}
        head={[insights.table.week, insights.table.starts]}
        rows={data.map((d) => [d.key, d.value])}
      />
    </figure>
  );
}
