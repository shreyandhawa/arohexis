import { Link } from 'react-router';
import { settings } from '../../copy/settings';
import type { Settings as Prefs, WeekDay } from '../../domain/config';
import { setPreference } from '../actions/preferences';
import { useData } from '../data/DataProvider';
import { useConfig } from '../hooks/useConfig';
import { Chip } from '../components/Chip';
import { useStill } from '../hooks/useStill';
import styles from '../layout/Shell.module.css';
import prefs from './SettingsPreferences.module.css';

const THEMES: readonly Prefs['theme'][] = ['system', 'light', 'dark'];
const DAYS: readonly WeekDay[] = [0, 1, 2, 3, 4, 5, 6];

export function Settings() {
  const { still, toggle } = useStill();
  const deps = useData();
  const prefsNow = useConfig()?.settings;
  return (
    <>
      <h1 className={styles['title']}>{settings.title}</h1>
      <ul className={styles['list']}>
        <li className={styles['listItem']}>
          <Link to="/plans" className={styles['listLink']}>
            {settings.plans}
          </Link>
        </li>
        <li className={styles['listItem']}>
          <Link to="/settings/parts" className={styles['listLink']}>
            {settings.parts}
          </Link>
        </li>
        <li className={styles['listItem']}>
          <Link to="/settings/feelings" className={styles['listLink']}>
            {settings.feelings}
          </Link>
        </li>
        <li className={styles['listItem']}>
          <Link to="/settings/obstacles" className={styles['listLink']}>
            {settings.obstacles}
          </Link>
        </li>
        <li className={styles['listItem']}>
          <Link to="/settings/data" className={styles['listLink']}>
            {settings.data}
          </Link>
        </li>
        <li className={styles['listItem']}>
          <Link to="/about" className={styles['listLink']}>
            {settings.about}
          </Link>
        </li>
      </ul>
      <section className={prefs['section']}>
        <h2 className={styles['subtitle']}>{settings.preferences}</h2>
        {prefsNow && (
          <>
            <div className={prefs['field']}>
              <label htmlFor="pref-theme">{settings.theme}</label>
              <select
                id="pref-theme"
                className={prefs['select']}
                value={prefsNow.theme}
                onChange={(e) =>
                  void setPreference(deps, { theme: e.target.value as Prefs['theme'] })
                }
              >
                {THEMES.map((t) => (
                  <option key={t} value={t}>
                    {settings.themeOptions[t]}
                  </option>
                ))}
              </select>
            </div>
            {(['weekStartsOn', 'checkinDay'] as const).map((key) => (
              <div key={key} className={prefs['field']}>
                <label htmlFor={`pref-${key}`}>{settings[key]}</label>
                <select
                  id={`pref-${key}`}
                  className={prefs['select']}
                  value={prefsNow[key]}
                  onChange={(e) => void setPreference(deps, { [key]: Number(e.target.value) })}
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {settings.days[d]}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </>
        )}
        <div className={prefs['row']}>
          <Chip pressed={still} aria-describedby="still-hint" onClick={toggle}>
            {settings.still}
          </Chip>
          <p id="still-hint" className={styles['muted']}>
            {settings.stillHint}
          </p>
        </div>
      </section>
    </>
  );
}
