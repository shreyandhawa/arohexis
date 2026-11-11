import { Link, useLocation } from 'react-router';
import { appName } from '../../copy/common';
import { nav, startsThisWeek } from '../../copy/home';
import { homeNotices } from '../../copy/stuck';
import { readNotice } from '../notice';
import { useStartsThisWeek } from '../hooks/useStartsThisWeek';
import { StuckButton } from '../layout/StuckButton';
import styles from '../layout/Shell.module.css';

export function Home() {
  const starts = useStartsThisWeek();
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
