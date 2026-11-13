import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { plans as copy } from '../../copy/plans';
import type { Config, Plan, WeekDay } from '../../domain/config';
import { planSentence } from '../../domain/plans';
import {
  downloadIcs,
  draftOf,
  emptyDraft,
  planFromDraft,
  savePlan,
  setPlanActive,
  type PlanDraft,
  type PlanProblem,
} from '../actions/plans';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { useData } from '../data/DataProvider';
import { useConfig } from '../hooks/useConfig';
import shell from '../layout/Shell.module.css';
import styles from './Plans.module.css';

const ALL_DAYS: readonly WeekDay[] = [0, 1, 2, 3, 4, 5, 6];
const PRESETS: readonly { label: string; days: WeekDay[] }[] = [
  { label: copy.presets.weekdays, days: [1, 2, 3, 4, 5] },
  { label: copy.presets.everyDay, days: [0, 1, 2, 3, 4, 5, 6] },
  { label: copy.presets.weekends, days: [0, 6] },
];

function sameDays(a: readonly WeekDay[], b: readonly WeekDay[]): boolean {
  return a.length === b.length && a.every((d) => b.includes(d));
}

function Form({ plan, config }: { plan: Plan | undefined; config: Config }) {
  const deps = useData();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<PlanDraft>(() => (plan ? draftOf(plan) : emptyDraft()));
  const [problems, setProblems] = useState<PlanProblem[]>([]);
  const [failed, setFailed] = useState(false);
  const set = (change: Partial<PlanDraft>) => setDraft((d) => ({ ...d, ...change }));

  // The preview reads the draft through the same builder as saving.
  const shown = planFromDraft(
    plan ?? {
      id: 'draft',
      place: '',
      firstAction: '',
      time: draft.time,
      days: [],
      graceMin: 0,
      active: true,
      createdAt: 0,
      editCount: 0,
    },
    { ...draft, firstAction: draft.firstAction.trim() || copy.actionPlaceholder },
  );
  const parts = config.parts.filter((p) => p.enabled || p.id === draft.partId);

  async function save() {
    setFailed(false);
    try {
      const result = await savePlan(deps, draft, plan);
      if ('problems' in result) setProblems(result.problems);
      else void navigate('/plans');
    } catch (error) {
      console.error(error);
      setFailed(true);
    }
  }

  async function toggleActive(current: Plan) {
    setFailed(false);
    try {
      await setPlanActive(deps, current, !current.active);
    } catch (error) {
      console.error(error);
      setFailed(true);
    }
  }

  const bad = (p: PlanProblem) => problems.includes(p);

  return (
    <div className={styles['screen']}>
      <h1 className={shell['title']}>{plan ? copy.edit : copy.new}</h1>
      <section aria-labelledby="preview-title">
        <h2 id="preview-title" className="visually-hidden">
          {copy.preview}
        </h2>
        <p className={styles['preview']} aria-live="polite" data-testid="plan-preview">
          {planSentence(shown)}
        </p>
      </section>
      <div className={styles['field']}>
        <label htmlFor="plan-time">{copy.time}</label>
        <input
          id="plan-time"
          className={styles['input']}
          type="time"
          value={draft.time}
          aria-invalid={bad('time')}
          onChange={(e) => set({ time: e.target.value })}
        />
        {bad('time') && <p className={styles['hint']}>{copy.invalid.time}</p>}
      </div>
      <fieldset className={styles['group']}>
        <legend className={styles['groupLabel']}>{copy.days}</legend>
        {ALL_DAYS.map((d) => (
          <Chip
            key={d}
            pressed={draft.days.includes(d)}
            onClick={() =>
              set({
                days: draft.days.includes(d)
                  ? draft.days.filter((x) => x !== d)
                  : [...draft.days, d],
              })
            }
          >
            {copy.dayLabels[d]}
          </Chip>
        ))}
      </fieldset>
      <div className={styles['group']}>
        {PRESETS.map((p) => (
          <Chip
            key={p.label}
            pressed={sameDays(draft.days, p.days)}
            onClick={() => set({ days: p.days })}
          >
            {p.label}
          </Chip>
        ))}
      </div>
      {bad('days') && <p className={styles['hint']}>{copy.invalid.days}</p>}
      <div className={styles['field']}>
        <label htmlFor="plan-place">{copy.place}</label>
        <input
          id="plan-place"
          className={styles['input']}
          type="text"
          value={draft.place}
          autoComplete="off"
          aria-describedby="plan-place-hint"
          onChange={(e) => set({ place: e.target.value })}
        />
        <p id="plan-place-hint" className={styles['hint']}>
          {copy.placeHint}
        </p>
      </div>
      <div className={styles['field']}>
        <label htmlFor="plan-detail">{copy.cueDetail}</label>
        <input
          id="plan-detail"
          className={styles['input']}
          type="text"
          value={draft.cueDetail}
          autoComplete="off"
          aria-describedby="plan-detail-hint"
          onChange={(e) => set({ cueDetail: e.target.value })}
        />
        <p id="plan-detail-hint" className={styles['hint']}>
          {copy.cueDetailHint}
        </p>
      </div>
      <div className={styles['field']}>
        <label htmlFor="plan-action">{copy.firstAction}</label>
        <input
          id="plan-action"
          className={styles['input']}
          type="text"
          value={draft.firstAction}
          autoComplete="off"
          aria-invalid={bad('firstAction')}
          aria-describedby="plan-action-hint"
          onChange={(e) => set({ firstAction: e.target.value })}
        />
        <p id="plan-action-hint" className={styles['hint']}>
          {bad('firstAction') ? copy.invalid.firstAction : copy.firstActionHint}
        </p>
      </div>
      <div className={styles['field']}>
        <label htmlFor="plan-part">{copy.part}</label>
        <select
          id="plan-part"
          className={styles['input']}
          value={draft.partId}
          onChange={(e) => set({ partId: e.target.value })}
        >
          <option value="">{copy.noPart}</option>
          {parts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <Button onClick={() => void save()}>{copy.save}</Button>
      {failed && <p className={styles['hint']}>{copy.saveFailed}</p>}
      {plan && (
        <>
          <Button variant="quiet" onClick={() => void toggleActive(plan)}>
            {plan.active ? copy.pause : copy.resume}
          </Button>
          <section className={styles['calendar']} aria-labelledby="calendar-title">
            <h2 id="calendar-title" className={shell['subtitle']}>
              {copy.calendar}
            </h2>
            <Button variant="quiet" onClick={() => downloadIcs(deps, plan, copy.fileFallback)}>
              {copy.calendar}
            </Button>
            <ul className={styles['help']}>
              {copy.calendarHelp.map((line) => (
                <li key={line}>{line}</li>
              ))}
              <li>{copy.calendarSaved}</li>
            </ul>
          </section>
        </>
      )}
      <Link to="/plans" className={shell['link']}>
        {copy.back}
      </Link>
    </div>
  );
}

export function PlanEditor() {
  const { planId } = useParams();
  const config = useConfig();
  if (!config) return null;
  if (planId === undefined) return <Form plan={undefined} config={config} key="new" />;
  const plan = config.plans.find((p) => p.id === planId);
  if (!plan)
    return (
      <div className={styles['screen']}>
        <p className={shell['muted']}>{copy.notFound}</p>
        <Link to="/plans" className={shell['link']}>
          {copy.back}
        </Link>
      </div>
    );
  return <Form plan={plan} config={config} key={`${plan.id}:${plan.editCount}`} />;
}
