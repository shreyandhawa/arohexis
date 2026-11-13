export const insights = {
  title: 'Insights',
  empty: 'Insights appear after a few starts.',
  weeksTitle: 'Starts per week',
  hoursTitle: 'When you start',
  feelingsTitle: 'Feelings',
  partsTitle: 'Parts',
  helpsTitle: 'What helps',
  automaticTitle: 'How automatic starting feels',
  helpsEmpty: 'Responses appear here once you have tried a few.',
  automaticEmpty: 'Your weekly check-in appears here after the first one.',
  earlyDays: 'early days',
  hourScale: ['12 AM', '6 AM', '12 PM', '6 PM'],
  table: {
    week: 'Week of',
    hour: 'Hour',
    feeling: 'Feeling',
    part: 'Part',
    starts: 'Starts',
    score: 'Mean (1 to 7)',
  },
} as const;

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function hourLabel(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${hour < 12 ? 'AM' : 'PM'}`;
}

export function responseCounts(shown: number, led: number): string {
  return `shown ${shown} · led to a start ${led}`;
}

export const chartSummary = {
  weeks(total: number, weeks: number, thisWeek: number): string {
    return `${plural(total, 'start', 'starts')} over ${plural(weeks, 'week', 'weeks')}, ${thisWeek} this week.`;
  },
  hours(total: number, topHour: number | undefined): string {
    return topHour === undefined
      ? 'No starts yet.'
      : `${plural(total, 'start', 'starts')} in all, most often around ${hourLabel(topHour)}.`;
  },
  bars(total: number, topLabel: string | undefined, topCount: number): string {
    return topLabel === undefined
      ? 'No starts yet.'
      : `${plural(total, 'start', 'starts')} in all, most from ${topLabel} (${topCount}).`;
  },
  line(points: number, latest: number | undefined): string {
    return latest === undefined
      ? 'No check-ins yet.'
      : `${plural(points, 'weekly check-in', 'weekly check-ins')}, the latest averaging ${latest.toFixed(1)} out of 7.`;
  },
} as const;
