import { useNavigate } from 'react-router';
import { demo } from '../../copy/demo';
import { useData } from '../data/DataProvider';
import styles from './DemoRibbon.module.css';

/** The persistent Demo ribbon (spec §7.4). The actions load only when used. */
export function DemoRibbon() {
  const deps = useData();
  const navigate = useNavigate();

  async function onExit() {
    (await import('../actions/demo')).exitDemo();
    window.location.assign('/');
  }
  async function onReset() {
    try {
      await (await import('../actions/demo')).resetDemo(deps);
      void navigate('/');
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className={styles['ribbon']} role="region" aria-label={demo.ribbon}>
      <p className={styles['label']}>{demo.ribbon}</p>
      <span className={styles['spacer']} />
      <button type="button" className={styles['action']} onClick={() => void onReset()}>
        {demo.reset}
      </button>
      <button type="button" className={styles['action']} onClick={() => void onExit()}>
        {demo.exit}
      </button>
    </div>
  );
}
