import { useState } from 'react';
import { Link, useLocation, useOutletContext } from 'react-router';
import { appName } from '../../copy/common';
import { installNote, nav, startsThisWeek } from '../../copy/home';
import { homeNotices } from '../../copy/stuck';
import { currentPlatformEnv, isIosSafariNonStandalone } from '../platform';
import { readNotice } from '../notice';
import { UpdateCard } from '../components/UpdateCard';
import { useHasEvents } from '../hooks/useHasEvents';
import { useStartsThisWeek } from '../hooks/useStartsThisWeek';
import { StuckButton } from '../layout/StuckButton';
import type { ShellContext } from '../layout/Shell';
import { Plate } from '../plate/Plate';
import styles from '../layout/Shell.module.css';
import homeStyles from './Home.module.css';

export function Home() {
  const starts = useStartsThisWeek();
  const hasEvents = useHasEvents();
  const { updateReady, reload } = useOutletContext<ShellContext>();
  const [selected, setSelected] = useState<string | null>(null);
  // Spec §8.11: only until the main database has any data.
  const showInstallNote = hasEvents === false && isIosSafariNonStandalone(currentPlatformEnv());
  const notice = readNotice(useLocation().state);
  return (
    <>
      <h1 className="visually-hidden">{appName}</h1>
      <Plate
        selected={selected}
        onSelect={setSelected}
        notice={notice ? homeNotices[notice] : undefined}
      />
      {/* At most one card, by priority (spec §8.1): the update card, then the install note. */}
      <div data-slot="card" className={homeStyles['card']}>
        {updateReady ? (
          <UpdateCard onReload={reload} />
        ) : (
          showInstallNote && <p className={styles['installNote']}>{installNote}</p>
        )}
      </div>
      <div className={homeStyles['thumbZone']}>
        <StuckButton variant="primary" />
        {starts > 0 && <p className={styles['muted']}>{startsThisWeek(starts)}</p>}
        <nav aria-label={nav.label} className={styles['nav']}>
          <Link to="/settings" className={styles['link']}>
            {nav.settings}
          </Link>
        </nav>
      </div>
    </>
  );
}
