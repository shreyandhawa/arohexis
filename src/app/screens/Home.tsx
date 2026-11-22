import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useOutletContext } from 'react-router';
import { appName } from '../../copy/common';
import { brain } from '../../copy/brain';
import { Button } from '../components/Button';
import { installNote, nav, startsThisWeek } from '../../copy/home';
import { homeNotices } from '../../copy/stuck';
import { currentPlatformEnv, isIosSafariNonStandalone } from '../platform';
import { readNotice } from '../notice';
import { UpdateCard } from '../components/UpdateCard';
import { useHasEvents } from '../hooks/useHasEvents';
import { useStartsThisWeek } from '../hooks/useStartsThisWeek';
import { useConfig } from '../hooks/useConfig';
import { useCheckinDue } from '../hooks/useCheckinDue';
import { usePlanState } from '../hooks/usePlanState';
import { StuckButton } from '../layout/StuckButton';
import type { ShellContext } from '../layout/Shell';
import { expireOccurrences } from '../actions/lapse';
import { hasSetUp, hasToured, hasWelcomed, markToured } from '../data/dbChoice';
import { useData } from '../data/DataProvider';
import { LapseSheet } from '../plans/LapseSheet';
import { CheckinCard } from '../plans/CheckinCard';
import { planNudgeShown } from '../plans/firstPlan';
import { PlanDueCard } from '../plans/PlanDueCard';
import { PlanNudgeCard } from '../plans/PlanNudgeCard';
import { Plate } from '../plate/Plate';
import { PlateBoundary } from '../plate/PlateBoundary';
import styles from '../layout/Shell.module.css';
import homeStyles from './Home.module.css';

// The part card and the walkthrough load on first use, outside the initial bundle.
const PartCard = lazy(() => import('../plate/PartCard').then((m) => ({ default: m.PartCard })));
const Tour = lazy(() => import('../layout/Tour').then((m) => ({ default: m.Tour })));
/** PartCard's heading id (`PART_CARD_TITLE_ID`), kept here so this import stays lazy. */
const PART_CARD_TITLE_ID = 'part-card-title';

export function Home() {
  const starts = useStartsThisWeek();
  const hasEvents = useHasEvents();
  const { updateReady, reload } = useOutletContext<ShellContext>();
  const [selected, setSelected] = useState<string | null>(null);
  const [touring, setTouring] = useState(() => !hasToured());
  // Spec §8.11: only until the main database has any data.
  const showInstallNote = hasEvents === false && isIosSafariNonStandalone(currentPlatformEnv());
  const deps = useData();
  const planState = usePlanState();
  const checkin = useCheckinDue();
  const config = useConfig();
  const expired = useRef(new Set<string>());
  // Older lapses are expired quietly, so there is never a list of them (spec §6.4).
  useEffect(() => {
    const fresh = (planState?.expire ?? []).filter((o) => {
      const key = `${o.planId}:${o.date}`;
      return !expired.current.has(key) && expired.current.add(key);
    });
    void expireOccurrences(deps, fresh).catch((e: unknown) => console.error(e));
  }, [deps, planState]);
  const notice = readNotice(useLocation().state);
  // First run: no data in the main database and onboarding not yet seen (spec §8.11).
  if (hasEvents === false && deps.mode === 'main' && !hasWelcomed()) {
    return <Navigate to="/welcome" replace />;
  }
  // An empty main record whose parts were never named goes to Setup, also after leaving the demo (ADR-045).
  if (hasEvents === false && deps.mode === 'main' && !hasSetUp()) {
    return <Navigate to="/setup" replace />;
  }
  return (
    <>
      <h1 className="visually-hidden">{appName}</h1>
      <PlateBoundary>
        <Plate
          selected={selected}
          onSelect={setSelected}
          lands={deps.mode === 'main'}
          notice={notice ? homeNotices[notice] : undefined}
        />
      </PlateBoundary>
      {deps.mode === 'main' ? <LapseSheet repair={planState?.repair} /> : null}
      {/* At most one card, by priority (spec §8.1, ADR-045): the selected part, plan due, the update card, the make-a-plan offer after a first start, the check-in, then the install note. */}
      <div data-slot="card" className={homeStyles['card']}>
        {selected !== null ? (
          <section
            data-part-card
            aria-labelledby={PART_CARD_TITLE_ID}
            className={homeStyles['partCard']}
          >
            <Suspense fallback={null}>
              <PartCard partId={selected} onClose={() => setSelected(null)} />
            </Suspense>
            <Button variant="quiet" onClick={() => setSelected(null)}>
              {brain.card.close}
            </Button>
          </section>
        ) : planState?.due ? (
          <PlanDueCard plan={planState.due.plan} occurrence={planState.due.occurrence} />
        ) : updateReady ? (
          <UpdateCard onReload={reload} />
        ) : hasEvents && config && planNudgeShown(deps.mode, config) ? (
          <PlanNudgeCard />
        ) : checkin?.due && hasEvents ? (
          <CheckinCard nudgeBackup={checkin.nudgeBackup} />
        ) : showInstallNote ? (
          <p className={styles['installNote']}>{installNote}</p>
        ) : null}
      </div>
      <div className={homeStyles['thumbZone']}>
        <StuckButton variant="primary" />
        {starts > 0 && <p className={styles['muted']}>{startsThisWeek(starts)}</p>}
        <nav aria-label={nav.label} data-tour="nav" className={styles['nav']}>
          <Link to="/plans" className={styles['navLink']}>
            {nav.plans}
          </Link>
          <Link to="/insights" className={styles['navLink']}>
            {nav.insights}
          </Link>
          <Link to="/replay" className={styles['navLink']}>
            {nav.replay}
          </Link>
          <Link to="/settings" className={styles['navLink']}>
            {nav.settings}
          </Link>
        </nav>
      </div>
      {touring && config && (
        <Suspense fallback={null}>
          <Tour
            onDone={() => {
              markToured();
              setTouring(false);
              document.querySelector<HTMLElement>('[data-tour="start"]')?.focus();
            }}
          />
        </Suspense>
      )}
    </>
  );
}
