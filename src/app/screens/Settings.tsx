import { Link } from 'react-router';
import { settings } from '../../copy/settings';
import { Chip } from '../components/Chip';
import { useStill } from '../hooks/useStill';
import styles from '../layout/Shell.module.css';
import prefs from './SettingsPreferences.module.css';

export function Settings() {
  const { still, toggle } = useStill();
  return (
    <>
      <h1 className={styles['title']}>{settings.title}</h1>
      <ul className={styles['list']}>
        <li className={styles['listItem']}>
          <Link to="/settings/parts" className={styles['listLink']}>
            {settings.parts}
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
