import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { demo } from '../../copy/demo';
import { stepOf, welcome as copy } from '../../copy/welcome';
import { enterDemo } from '../actions/demo';
import { Button } from '../components/Button';
import { markWelcomed } from '../data/dbChoice';
import { useData } from '../data/DataProvider';
import { currentPlatformEnv, isIosSafariNonStandalone } from '../platform';
import shell from '../layout/Shell.module.css';
import styles from './Welcome.module.css';

/** First-run onboarding (spec §8.11). The Home Screen step shows only in iOS Safari, in a tab. */
export function Welcome() {
  const deps = useData();
  const navigate = useNavigate();
  const [ios] = useState(() => isIosSafariNonStandalone(currentPlatformEnv()));
  const total = ios ? 3 : 2;
  const [step, setStep] = useState(1);
  const [failed, setFailed] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  // The steps replace each other, so focus follows to the new heading.
  useEffect(() => {
    if (step > 1) heading.current?.focus();
  }, [step]);

  const kind = step === 1 ? 'intro' : step === 2 && ios ? 'ios' : 'choose';

  function startFresh() {
    markWelcomed();
    void navigate('/', { replace: true });
  }
  async function explore() {
    setFailed(false);
    try {
      await enterDemo(deps);
      markWelcomed();
      window.location.assign('/');
    } catch (error) {
      console.error(error);
      setFailed(true);
    }
  }

  return (
    <div className={styles['page']}>
      <main className={styles['screen']}>
        <p className={styles['step']}>{stepOf(step, total)}</p>
        <h1 ref={heading} tabIndex={-1} className={shell['title']}>
          {kind === 'choose' ? copy.choose : copy.title}
        </h1>
        {kind === 'intro' && (
          <>
            <p>{copy.intro}</p>
            <p className={shell['muted']}>{copy.notMedicalAdvice}</p>
          </>
        )}
        {kind === 'ios' && <p>{copy.ios}</p>}
        {kind === 'choose' ? (
          <>
            <div className={styles['choice']}>
              <Button onClick={startFresh}>{copy.startFresh}</Button>
              <p className={shell['muted']}>{copy.startFreshHint}</p>
            </div>
            <div className={styles['choice']}>
              <Button variant="quiet" onClick={() => void explore()}>
                {copy.exploreDemo}
              </Button>
              <p className={shell['muted']}>{copy.exploreDemoHint}</p>
            </div>
            <div aria-live="polite">
              {failed && <p className={styles['error']}>{demo.failed}</p>}
            </div>
          </>
        ) : (
          <Button onClick={() => setStep((n) => n + 1)}>{copy.next}</Button>
        )}
      </main>
    </div>
  );
}
