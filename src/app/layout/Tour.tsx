import { useEffect, useRef, useState } from 'react';
import { tour as copy } from '../../copy/tour';
import { stepOf } from '../../copy/welcome';
import { Button } from '../components/Button';
import styles from './Tour.module.css';

type Box = { top: number; left: number; width: number; height: number };
const PAD = 6;

function boxOf(target: string): Box | null {
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: r.top - PAD,
    left: r.left - PAD,
    width: r.width + PAD * 2,
    height: r.height + PAD * 2,
  };
}

const same = (a: Box | null, b: Box | null) =>
  a === b ||
  (!!a &&
    !!b &&
    a.top === b.top &&
    a.left === b.left &&
    a.width === b.width &&
    a.height === b.height);

/** Coach marks over Home's real controls (ADR-045): a ring on each in turn, with a short card. */
export function Tour({ onDone }: { onDone(): void }) {
  const steps = copy.steps;
  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const next = useRef<HTMLButtonElement>(null);
  const step = steps[i]!;
  const last = i === steps.length - 1;

  // Follows the target while layout settles, scrolls or resizes. Only a changed box re-renders.
  useEffect(() => {
    document.querySelector(`[data-tour="${step.target}"]`)?.scrollIntoView({ block: 'nearest' });
    let frame = 0;
    const measure = () => {
      const b = boxOf(step.target);
      setBox((old) => (same(old, b) ? old : b));
      frame = requestAnimationFrame(measure);
    };
    measure();
    return () => cancelAnimationFrame(frame);
  }, [step.target]);

  useEffect(() => next.current?.focus(), [i]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDone();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onDone]);

  const below = !box || box.top + box.height / 2 < window.innerHeight / 2;
  const place = !box
    ? { top: '50%', transform: 'translateY(-50%)' }
    : below
      ? { top: box.top + box.height + 12 }
      : { bottom: window.innerHeight - box.top + 12 };

  return (
    <>
      {box && <div aria-hidden="true" className={styles['ring']} style={box} />}
      <div
        role="dialog"
        aria-modal="false"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        className={styles['card']}
        style={place}
      >
        <p className={styles['step']}>{stepOf(i + 1, steps.length)}</p>
        <h2 id="tour-title" className={styles['title']}>
          {step.title}
        </h2>
        <p id="tour-body" className={styles['body']}>
          {step.body}
        </p>
        <div className={styles['actions']}>
          <Button variant="quiet" className={styles['skip']} onClick={onDone}>
            {copy.skip}
          </Button>
          {i > 0 && (
            <Button variant="quiet" onClick={() => setI(i - 1)}>
              {copy.back}
            </Button>
          )}
          <Button ref={next} onClick={() => (last ? onDone() : setI(i + 1))}>
            {last ? copy.done : copy.next}
          </Button>
        </div>
      </div>
    </>
  );
}
