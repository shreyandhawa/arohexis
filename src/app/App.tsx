import { BrowserRouter } from 'react-router';
import { useEffect } from 'react';
import { hasWelcomed } from './data/dbChoice';
import { DataProvider } from './data/DataProvider';
import { useConfig } from './hooks/useConfig';
import { AppRoutes } from './routes';

const THEME_MIRROR = 'arohexis:theme';

/** Sets data-theme on <html> from JS: the CSP forbids inline styles and scripts. */
function ThemeSync() {
  const theme = useConfig()?.settings.theme;
  useEffect(() => {
    if (theme === undefined) return;
    // Before Welcome, the default 'system' is no choice: theme.js's dark first visit stands (ADR-036).
    if (theme === 'system' && !hasWelcomed()) return;
    const root = document.documentElement;
    // theme.js reads this mirror before first paint, so there is no flash.
    try {
      localStorage.setItem(THEME_MIRROR, theme);
    } catch {
      // Storage may be unavailable; the stored setting still applies.
    }
    if (theme === 'system') delete root.dataset['theme'];
    else root.dataset['theme'] = theme;
  }, [theme]);
  return null;
}

export function App() {
  return (
    <DataProvider>
      <ThemeSync />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </DataProvider>
  );
}
