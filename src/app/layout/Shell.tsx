import { useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { backToHome } from '../../copy/common';
import { StuckButton } from './StuckButton';
import styles from './Shell.module.css';

const TEXT_ENTRY = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

function isTyping(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(TEXT_ENTRY) !== null;
}

/** The stuck flow and the Started screen have their own primary action. */
function inFlow(pathname: string): boolean {
  return /^\/(stuck|started)(\/|$)/.test(pathname);
}

export function Shell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const flow = inFlow(pathname);
  const home = pathname === '/';

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
    <div className={styles['page']}>
      {!home && !flow && (
        <header className={styles['header']}>
          <Link to="/" className={styles['link']}>
            {backToHome}
          </Link>
        </header>
      )}
      <main className={styles['main']}>
        <Outlet />
      </main>
      {!home && !flow && (
        <footer className={styles['footer']}>
          <StuckButton variant="quiet" />
        </footer>
      )}
    </div>
  );
}
