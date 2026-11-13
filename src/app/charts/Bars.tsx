import { HiddenTable } from './HiddenTable';
import styles from './Charts.module.css';

export type BarItem = { key: string; label: string; value: number };

/** Horizontal bars, one row per item, all in the same neutral fill. */
export function Bars({
  items,
  summary,
  caption,
  labelHead,
  valueHead,
}: {
  items: readonly BarItem[];
  summary: string;
  caption: string;
  labelHead: string;
  valueHead: string;
}) {
  const max = Math.max(1, ...items.map((d) => d.value));
  return (
    <figure className={styles['chart']}>
      <ul className={styles['rows']} aria-hidden="true">
        {items.map((d) => (
          <li key={d.key} className={styles['row']}>
            <span>{d.label}</span>
            <span className={styles['count']}>{d.value}</span>
            <svg viewBox="0 0 100 10" preserveAspectRatio="none" className={styles['rowBar']}>
              <rect
                x="0"
                y="0"
                width={(d.value / max) * 100}
                height="10"
                className={styles['bar']}
              />
            </svg>
          </li>
        ))}
      </ul>
      <figcaption className={styles['summary']}>{summary}</figcaption>
      <HiddenTable
        caption={caption}
        head={[labelHead, valueHead]}
        rows={items.map((d) => [d.label, d.value])}
      />
    </figure>
  );
}
