import { useEffect, useMemo, useRef, useState } from 'react';
import { welcome as copy } from '../../copy/welcome';
import { foldAttempts, type Attempt } from '../../domain/attempts';
import { projectAt, replayMoments } from '../../domain/brainSpace';
import type { Part } from '../../domain/config';
import { freshDemo } from '../actions/demo';
import { useData } from '../data/DataProvider';
import { useStill } from '../hooks/useStill';
import { useRenderer } from '../plate/useRenderer';
import styles from './WelcomeHero.module.css';

const FRAMES = 30;
const HERO_MS = 2500;
const noop = () => undefined;

type Loaded = { attempts: Attempt[]; parts: readonly Part[]; moments: number[] };

/** The demo brain lighting up once, drawn on a plate-only canvas. It reads no database. */
export function WelcomeHero() {
  const deps = useData();
  const { clock } = deps;
  const { still } = useStill();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState<Loaded | undefined>();
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    let cancelled = false;
    freshDemo(deps)
      .then((data) => {
        if (cancelled) return;
        const attempts = foldAttempts(data.events);
        setLoaded({ attempts, parts: data.parts, moments: replayMoments(attempts) });
      })
      .catch((error: unknown) => console.error(error));
    return () => {
      cancelled = true;
    };
  }, [deps]);

  const n = loaded?.moments.length ?? 0;

  const state = useMemo(() => {
    if (!loaded) return undefined;
    const k = still ? n : Math.ceil((n * frame) / FRAMES);
    const space = projectAt(loaded.attempts, loaded.parts, loaded.moments[k - 1] ?? -Infinity);
    // Resting after the one play, so the signals stop and the loop goes idle.
    return {
      space,
      parts: loaded.parts,
      selected: null,
      still: still || frame >= FRAMES,
    };
  }, [loaded, n, frame, still]);

  const { ready } = useRenderer(
    canvas,
    { variant: 'plate', now: () => clock.now(), onPartTap: noop },
    state,
  );

  // Plays once, 30 frames over 2.5 s, only when the renderer and the data are both in.
  useEffect(() => {
    if (!ready || !loaded || still) return;
    const ids: number[] = [];
    for (let f = 1; f <= FRAMES; f++)
      ids.push(window.setTimeout(() => setFrame(f), (HERO_MS * f) / FRAMES));
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [ready, loaded, still]);

  return (
    <div role="img" aria-label={copy.heroLabel} className={`plate plate-scope ${styles.hero}`}>
      <canvas ref={canvas} aria-hidden="true" className={styles.canvas} />
    </div>
  );
}
