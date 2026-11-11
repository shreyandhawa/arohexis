import { Link } from 'react-router';
import { appName } from '../../copy/common';
import { nav, startsThisWeek } from '../../copy/home';
import { useStartsThisWeek } from '../hooks/useStartsThisWeek';
import { StuckButton } from '../layout/StuckButton';
import styles from '../layout/Shell.module.css';

export function Home() {
  const starts = useStartsThisWeek();
  return (
    <>
      <h1 className={styles['title']}>{appName}</h1>
      <div className={styles['thumbZone']}>
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
