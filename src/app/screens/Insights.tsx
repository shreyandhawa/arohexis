import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { insights as copy, responseCounts } from '../../copy/insights';
import { foldAttempts } from '../../domain/attempts';
import { checkinTrend } from '../../domain/checkin';
import { DEFAULT_SETTINGS } from '../../domain/config';
import {
  responseStats,
  startsByFeeling,
  startsByHour,
  startsByPart,
  startsByWeek,
} from '../../domain/metrics';
import { Bars } from '../charts/Bars';
import { Columns } from '../charts/Columns';
import { HourStrip } from '../charts/HourStrip';
import { Line } from '../charts/Line';
import { barsSummary, hoursSummary, lineSummary, weeksSummary } from '../charts/summaries';
import { useData } from '../data/DataProvider';
import { useConfig } from '../hooks/useConfig';
import { useNow } from '../hooks/useNow';
import shell from '../layout/Shell.module.css';
import styles from './Insights.module.css';

const REFRESH_MS = 60_000;
const MIN_STARTS = 3;

export function Insights() {
  const { events, clock } = useData();
  const config = useConfig();
  const now = useNow(REFRESH_MS);
  const all = useLiveQuery(() => events.list(), [events]);
  const weekStartsOn = config?.settings.weekStartsOn ?? DEFAULT_SETTINGS.weekStartsOn;

  const view = useMemo(() => {
    if (!all) return undefined;
    const attempts = foldAttempts(all);
    const hours = startsByHour(attempts);
    return {
      weeks: startsByWeek(attempts, now, clock.timeZone(), weekStartsOn),
      hours,
      total: hours.reduce((n, c) => n + c, 0),
      feelings: startsByFeeling(attempts),
      parts: startsByPart(attempts),
      stats: responseStats(attempts),
      trend: checkinTrend(all),
    };
  }, [all, now, clock, weekStartsOn]);

  if (!view || !config) return null;

  if (view.total < MIN_STARTS) {
    return (
      <div className={styles['screen']}>
        <h1 className={shell['title']}>{copy.title}</h1>
        <p className={shell['muted']}>{copy.empty}</p>
      </div>
    );
  }

  const helps = [...config.feelings]
    .sort((a, b) => a.order - b.order)
    .map((feeling) => ({
      feeling,
      rows: config.responses
        .filter((r) => r.feelingId === feeling.id)
        .flatMap((r) => {
          const stat = view.stats.find((s) => s.responseId === r.id);
          return stat ? [{ response: r, stat }] : [];
        }),
    }))
    .filter((g) => g.rows.length > 0);

  return (
    <div className={styles['screen']}>
      <h1 className={shell['title']}>{copy.title}</h1>

      <section className={styles['section']} aria-labelledby="ins-weeks">
        <h2 id="ins-weeks" className={shell['subtitle']}>
          {copy.weeksTitle}
        </h2>
        <Columns
          data={view.weeks.map((w) => ({ key: w.weekOf, value: w.count }))}
          summary={weeksSummary(view.weeks)}
        />
      </section>

      <section className={styles['section']} aria-labelledby="ins-hours">
        <h2 id="ins-hours" className={shell['subtitle']}>
          {copy.hoursTitle}
        </h2>
        <HourStrip hours={view.hours} summary={hoursSummary(view.hours)} />
      </section>

      <section className={styles['section']} aria-labelledby="ins-feelings">
        <h2 id="ins-feelings" className={shell['subtitle']}>
          {copy.feelingsTitle}
        </h2>
        <Bars
          items={view.feelings.map((f) => ({ key: f.id, label: f.label, value: f.count }))}
          summary={barsSummary(view.feelings)}
          caption={copy.feelingsTitle}
          labelHead={copy.table.feeling}
          valueHead={copy.table.starts}
        />
      </section>

      <section className={styles['section']} aria-labelledby="ins-parts">
        <h2 id="ins-parts" className={shell['subtitle']}>
          {copy.partsTitle}
        </h2>
        <Bars
          items={view.parts.map((p) => ({ key: p.id ?? 'none', label: p.label, value: p.count }))}
          summary={barsSummary(view.parts)}
          caption={copy.partsTitle}
          labelHead={copy.table.part}
          valueHead={copy.table.starts}
        />
      </section>

      <section className={styles['section']} aria-labelledby="ins-helps">
        <h2 id="ins-helps" className={shell['subtitle']}>
          {copy.helpsTitle}
        </h2>
        {helps.length === 0 && <p className={shell['muted']}>{copy.helpsEmpty}</p>}
        {helps.map(({ feeling, rows }) => (
          <div key={feeling.id} className={styles['section']}>
            <h3 className={styles['feeling']}>{feeling.label}</h3>
            <ul className={styles['responses']}>
              {rows.map(({ response, stat }) => (
                <li key={response.id} className={styles['response']}>
                  <span>{response.body}</span>
                  <span className={shell['muted']}>
                    {responseCounts(stat.shown, stat.ledToStart)}
                    {stat.earlyDays ? ` · ${copy.earlyDays}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className={styles['section']} aria-labelledby="ins-auto">
        <h2 id="ins-auto" className={shell['subtitle']}>
          {copy.automaticTitle}
        </h2>
        {view.trend.length === 0 ? (
          <p className={shell['muted']}>{copy.automaticEmpty}</p>
        ) : (
          <Line
            points={view.trend.map((t) => ({ key: t.weekOf, value: t.score }))}
            summary={lineSummary(view.trend)}
          />
        )}
      </section>
    </div>
  );
}
