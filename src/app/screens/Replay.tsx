import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { brain } from '../../copy/brain';
import { foldAttempts } from '../../domain/attempts';
import { projectAt, replayMoments } from '../../domain/brainSpace';
import { Button } from '../components/Button';
import { useData } from '../data/DataProvider';
import { useConfig } from '../hooks/useConfig';
import { useStill } from '../hooks/useStill';
import shell from '../layout/Shell.module.css';
import { Plate } from '../plate/Plate';
import { PlateBoundary } from '../plate/PlateBoundary';
import styles from './Replay.module.css';

const copy = brain.replay;
/** A whole history plays in about this long, however many starts it has (ADR-037). */
const PLAY_MS = 8000;
const dateOf = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' });

/** Replay, "watch it grow": the light as it stood after each start, cumulative only. */
export function Replay() {
  const { events } = useData();
  const config = useConfig();
  const { still } = useStill();
  const all = useLiveQuery(() => events.list(), [events]);
  const attempts = useMemo(() => (all ? foldAttempts(all) : undefined), [all]);
  const moments = useMemo(() => (attempts ? replayMoments(attempts) : []), [attempts]);
  const n = moments.length;
  /** How many starts are shown; null follows the latest, so new starts appear. */
  const [step, setStep] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const k = Math.min(step ?? n, n);
  const at = moments[k - 1] ?? -Infinity;

  const data = useMemo(
    () =>
      attempts && config && { space: projectAt(attempts, config.parts, at), parts: config.parts },
    [attempts, config, at],
  );

  // Playback steps one start at a time and stops at the end; it never loops. Still stops it.
  useEffect(() => {
    if (!playing || still) return;
    if (k >= n) {
      setPlaying(false);
      return;
    }
    const id = window.setTimeout(() => setStep(k + 1), Math.max(16, PLAY_MS / n));
    return () => window.clearTimeout(id);
  }, [playing, still, k, n]);

  if (!attempts || !config) return null;

  return (
    <div className={styles['screen']}>
      <h1 className={shell['title']}>{copy.title}</h1>
      {n === 0 ? (
        <p className={shell['muted']}>{copy.empty}</p>
      ) : (
        <>
          <div className={styles['stage']}>
            <PlateBoundary>
              <Plate selected={selected} onSelect={setSelected} data={data} />
            </PlateBoundary>
          </div>
          <div className={styles['controls']}>
            <input
              type="range"
              className={styles['range']}
              min={1}
              max={n}
              value={k}
              aria-label={copy.moment}
              aria-valuetext={copy.position(k, n, dateOf.format(at))}
              onChange={(event) => {
                setPlaying(false);
                setStep(Number(event.target.value));
              }}
            />
            {!still && (
              <Button
                variant="quiet"
                onClick={() => {
                  if (!playing && k >= n) setStep(1);
                  setPlaying(!playing);
                }}
              >
                {playing ? copy.pause : copy.play}
              </Button>
            )}
          </div>
          <p className={styles['position']} aria-hidden="true">
            {copy.position(k, n, dateOf.format(at))}
          </p>
        </>
      )}
    </div>
  );
}
