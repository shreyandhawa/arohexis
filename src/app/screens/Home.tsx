import { Link, useLocation } from 'react-router';
import { appName } from '../../copy/common';
import { installNote, nav, startsThisWeek } from '../../copy/home';
import { homeNotices } from '../../copy/stuck';
import { currentPlatformEnv, isIosSafariNonStandalone } from '../platform';
import { readNotice } from '../notice';
import { useHasEvents } from '../hooks/useHasEvents';
import { useStartsThisWeek } from '../hooks/useStartsThisWeek';
import { StuckButton } from '../layout/StuckButton';
import styles from '../layout/Shell.module.css';

export function Home() {
  const starts = useStartsThisWeek();
  const hasEvents = useHasEvents();
  // Spec §8.11: only until the main database has any data.
  const showInstallNote = hasEvents === false && isIosSafariNonStandalone(currentPlatformEnv());
  const notice = readNotice(useLocation().state);
  return (
    <>
      <h1 className={styles['title']}>{appName}</h1>
      <div className={styles['thumbZone']}>
        {notice && (
          <p role="status" className={styles['notice']}>
            {homeNotices[notice]}
          </p>
        )}
        {showInstallNote && <p className={styles['installNote']}>{installNote}</p>}
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
