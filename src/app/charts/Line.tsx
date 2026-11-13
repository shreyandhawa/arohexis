import { insights } from '../../copy/insights';
import { HiddenTable } from './HiddenTable';
import styles from './Charts.module.css';

export type LinePoint = { key: string; value: number };

const LEFT = 14;
const W = 300;
const H = 90;
const TOP = 6;
const y = (v: number) => TOP + ((7 - v) / 6) * H;

/** Weekly means on a fixed 1 to 7 axis, evenly spaced. */
export function Line({ points, summary }: { points: readonly LinePoint[]; summary: string }) {
  const step = points.length > 1 ? (W - LEFT - 4) / (points.length - 1) : 0;
  const x = (i: number) => (points.length > 1 ? LEFT + i * step : (W + LEFT) / 2);
  return (
    <figure className={styles['chart']}>
      <svg viewBox={`0 0 ${W} ${H + TOP * 2}`} className={styles['svg']} aria-hidden="true">
        {[1, 4, 7].map((t) => (
          <g key={t}>
            <line x1={LEFT} x2={W} y1={y(t)} y2={y(t)} className={styles['grid']} />
            <text x="0" y={y(t) + 3} className={styles['tick']}>
              {t}
            </text>
          </g>
        ))}
        {points.length > 1 && (
          <polyline
            className={styles['line']}
            points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')}
          />
        )}
        {points.map((p, i) => (
          <circle key={p.key} cx={x(i)} cy={y(p.value)} r="3" className={styles['dot']} />
        ))}
      </svg>
      <figcaption className={styles['summary']}>{summary}</figcaption>
      <HiddenTable
        caption={insights.automaticTitle}
        head={[insights.table.week, insights.table.score]}
        rows={points.map((p) => [p.key, p.value.toFixed(1)])}
      />
    </figure>
  );
}
