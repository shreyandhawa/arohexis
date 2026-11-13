import { useCallback, useEffect, useMemo } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { backToHome } from '../../copy/common';
import { isTyping } from '../typing';
import { UpdateCard } from '../components/UpdateCard';
import { StuckButton } from './StuckButton';
import styles from './Shell.module.css';

/** What Shell tells Home about the service worker, so Home can show its one card. */
export type ShellContext = { updateReady: boolean; reload(): void };

/** The stuck flow and the Started screen have their own primary action. */
function inFlow(pathname: string): boolean {
  return /^\/(stuck|started)(\/|$)/.test(pathname);
}

export function Shell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const flow = inFlow(pathname);
  const home = pathname === '/';
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  const reload = useCallback(() => void updateServiceWorker(true), [updateServiceWorker]);
  const context = useMemo<ShellContext>(
    () => ({ updateReady: needRefresh, reload }),
    [needRefresh, reload],
  );

  useEffect(() => {
    if (flow) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.toLowerCase() !== 's' || isTyping(event.target)) return;
      void navigate('/stuck');
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [flow, navigate]);

  return (
    <div className={home ? `${styles['page']} ${styles['pageHome']}` : styles['page']}>
      <div data-slot="ribbon" />
      {!home && !flow && (
        <header className={styles['header']}>
          <Link to="/" className={styles['link']}>
            {backToHome}
          </Link>
        </header>
      )}
      {/* Home shows the update card in its own card slot (spec §8.1, ADR-035). */}
      {needRefresh && !home && !flow && <UpdateCard onReload={reload} />}
      <main className={home ? `${styles['main']} ${styles['mainHome']}` : styles['main']}>
        <Outlet context={context} />
      </main>
      {!home && !flow && (
        <footer className={styles['footer']}>
          <StuckButton variant="quiet" />
        </footer>
      )}
    </div>
  );
}
