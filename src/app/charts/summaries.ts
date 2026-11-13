import { chartSummary } from '../../copy/insights';
import type { FeelingCount, PartCount, WeekCount } from '../../domain/metrics';
import type { TrendPoint } from '../../domain/checkin';

export function weeksSummary(weeks: readonly WeekCount[]): string {
  const total = weeks.reduce((n, w) => n + w.count, 0);
  return chartSummary.weeks(total, weeks.length, weeks.at(-1)?.count ?? 0);
}

export function hoursSummary(hours: readonly number[]): string {
  const total = hours.reduce((n, c) => n + c, 0);
  const max = Math.max(...hours);
  return chartSummary.hours(total, max > 0 ? hours.indexOf(max) : undefined);
}

export function barsSummary(items: readonly (FeelingCount | PartCount)[]): string {
  const total = items.reduce((n, c) => n + c.count, 0);
  const top = items.reduce<FeelingCount | PartCount | undefined>(
    (best, c) => (best && best.count >= c.count ? best : c),
    undefined,
  );
  return chartSummary.bars(total, top?.label, top?.count ?? 0);
}

export function lineSummary(trend: readonly TrendPoint[]): string {
  return chartSummary.line(trend.length, trend.at(-1)?.score);
}
