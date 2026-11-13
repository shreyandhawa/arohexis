import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { lapse as copy } from '../../copy/plans';
import type { Plan } from '../../domain/config';
import type { RepairChoice } from '../../domain/lapse';
import { formatPlanTime, type Occurrence } from '../../domain/plans';
import { finishRepair, slipOccurrence, startPlan } from '../actions/lapse';
import { Button } from '../components/Button';
import { useData } from '../data/DataProvider';
import { useConfig } from '../hooks/useConfig';
import { Sheet } from '../plate/Sheet';
import styles from './LapseSheet.module.css';

type Target = { plan: Plan; occurrence: Occurrence };
type Step = 'intro' | 'obstacle' | 'help' | 'done';
type Field = 'smaller' | 'move';

const TITLE_ID = 'lapse-title';

/** Spec §8.7. Opens by itself for the one lapse to repair; closing unfinished records `slipped`. */
export function LapseSheet({ repair }: { repair: Target | undefined }) {
  const [target, setTarget] = useState<Target | null>(null);
  const handled = useRef(new Set<string>());
  const current = useRef<Target | null>(null);
  const finished = useRef(false);
  const deps = useData();

  useEffect(() => {
    if (!repair || current.current) return;
    const key = `${repair.plan.id}:${repair.occurrence.date}`;
    if (handled.current.has(key)) return;
    handled.current.add(key);
    finished.current = false;
    current.current = repair;
    setTarget(repair);
  }, [repair]);

  function close() {
    const t = current.current;
    if (!t) return;
    current.current = null;
    setTarget(null);
    if (!finished.current)
      void slipOccurrence(deps, t.plan.id, t.occurrence.date).catch((e: unknown) =>
        console.error(e),
      );
  }

  return (
    <Sheet open={target !== null} onClose={close} labelledBy={TITLE_ID} opener={null}>
      {target && (
        <Steps
          key={`${target.plan.id}:${target.occurrence.date}`}
          target={target}
          onFinished={() => {
            finished.current = true;
          }}
        />
      )}
    </Sheet>
  );
}

function Steps({ target, onFinished }: { target: Target; onFinished(): void }) {
  const { plan, occurrence } = target;
  const deps = useData();
  const navigate = useNavigate();
  const config = useConfig();
  const [step, setStep] = useState<Step>('intro');
  const [startedAnyway, setStartedAnyway] = useState(false);
  const [obstacle, setObstacle] = useState<{ id: string; label: string }>();
  const [field, setField] = useState<Field>();
  const [text, setText] = useState('');
  const [time, setTime] = useState(plan.time);
  const [failed, setFailed] = useState(false);
  const busy = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);

  // A tapped button unmounts with its step, so focus goes to the heading.
  useEffect(() => heading.current?.focus(), [step]);

  const label = `${formatPlanTime(plan.time)} · ${plan.firstAction.trim()}`;
  const obstacles = (config?.obstacles ?? []).filter((o) => o.enabled);

  async function guarded(work: () => Promise<void>) {
    if (busy.current) return;
    busy.current = true;
    setFailed(false);
    try {
      await work();
    } catch (error) {
      console.error(error);
      setFailed(true);
    } finally {
      busy.current = false;
    }
  }

  function choose(choice: RepairChoice) {
    void guarded(async () => {
      await finishRepair(deps, plan, occurrence.date, {
        startedAnyway,
        ...(obstacle && { obstacle }),
        choice,
        ...(choice === 'smaller' && { firstAction: text }),
        ...(choice === 'move' && { time }),
      });
      onFinished();
      setStep('done');
    });
  }

  function twoMinutes() {
    void guarded(async () => {
      const id = await startPlan(deps, plan, config?.parts ?? []);
      void navigate(`/started/${id}`);
    });
  }

  return (
    <div className={styles['steps']}>
      <h2 id={TITLE_ID} ref={heading} tabIndex={-1} className={styles['title']}>
        {step === 'done' ? (
          copy.updated
        ) : (
          <>
            {copy.happened} <em>{label}</em>.
          </>
        )}
      </h2>
      {step === 'intro' && (
        <>
          <p className={styles['line']}>{copy.learning}</p>
          <p className={styles['line']}>{copy.askStarted}</p>
          <div className={styles['row']}>
            <Button
              variant="quiet"
              onClick={() => {
                setStartedAnyway(true);
                setStep('help');
              }}
            >
              {copy.yes}
            </Button>
            <Button variant="quiet" onClick={() => setStep('obstacle')}>
              {copy.no}
            </Button>
          </div>
        </>
      )}
      {step === 'obstacle' && (
        <>
          <p className={styles['line']}>{copy.obstacle}</p>
          <div className={styles['chips']}>
            {obstacles.map((o) => (
              <Button
                key={o.id}
                variant="quiet"
                onClick={() => {
                  setObstacle({ id: o.id, label: o.label });
                  setStep('help');
                }}
              >
                {o.label}
              </Button>
            ))}
          </div>
          <Button variant="quiet" onClick={() => setStep('help')}>
            {copy.skip}
          </Button>
        </>
      )}
      {step === 'help' && (
        <>
          <p className={styles['line']}>{copy.help}</p>
          <div className={styles['chips']}>
            <Button variant="quiet" onClick={() => choose('keep')}>
              {copy.keep}
            </Button>
            <Button variant="quiet" onClick={() => setField('smaller')}>
              {copy.smaller}
            </Button>
            <Button variant="quiet" onClick={() => setField('move')}>
              {copy.move}
            </Button>
            <Button variant="quiet" onClick={() => choose('pause')}>
              {copy.pause}
            </Button>
          </div>
          {field === 'smaller' && (
            <div className={styles['field']}>
              <label htmlFor="lapse-smaller">{copy.smallerField}</label>
              <input
                id="lapse-smaller"
                className={styles['input']}
                type="text"
                value={text}
                autoComplete="off"
                onChange={(e) => setText(e.target.value)}
              />
              <Button onClick={() => choose('smaller')}>{copy.apply}</Button>
            </div>
          )}
          {field === 'move' && (
            <div className={styles['field']}>
              <label htmlFor="lapse-move">{copy.moveField}</label>
              <input
                id="lapse-move"
                className={styles['input']}
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
              <Button onClick={() => choose('move')}>{copy.apply}</Button>
            </div>
          )}
        </>
      )}
      {step === 'done' && (
        <Button variant="quiet" onClick={twoMinutes}>
          {copy.twoMinutes}
        </Button>
      )}
      <p aria-live="polite" className={styles['error']}>
        {failed ? copy.failed : ''}
      </p>
    </div>
  );
}
