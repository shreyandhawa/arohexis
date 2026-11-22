import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { setup as copy } from '../../copy/setup';
import { PART_LABEL_MAX } from '../../domain/parts';
import { setUpParts } from '../actions/parts';
import { Button } from '../components/Button';
import chip from '../components/Chip.module.css';
import { markSetUp } from '../data/dbChoice';
import { useData } from '../data/DataProvider';
import shell from '../layout/Shell.module.css';
import welcome from './Welcome.module.css';
import styles from './Setup.module.css';

/** First-run parts setup (ADR-045): the user names their own parts before Home. */
export function Setup() {
  const deps = useData();
  const navigate = useNavigate();
  const [names, setNames] = useState<string[]>(['', '', '', '', '', '']);
  const [unsaved, setUnsaved] = useState(false);
  const ready = names.some((n) => n.trim() !== '');
  const used = new Set(names.map((n) => n.trim().toLowerCase()));

  function fill(idea: string) {
    const free = names.findIndex((n) => n.trim() === '');
    if (free !== -1) setNames(names.map((n, i) => (i === free ? idea : n)));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready) return;
    setUnsaved(false);
    try {
      if ((await setUpParts(deps, names)) === undefined) {
        markSetUp();
        void navigate('/', { replace: true });
      } else setUnsaved(true);
    } catch (error) {
      console.error(error);
      setUnsaved(true);
    }
  }

  return (
    <div className={welcome['page']}>
      <main className={welcome['screen']}>
        <h1 className={shell['title']}>{copy.title}</h1>
        <p className={shell['muted']}>{copy.hint}</p>
        <form className={styles['form']} onSubmit={(e) => void submit(e)} noValidate>
          <ol className={styles['fields']}>
            {names.map((name, i) => (
              <li key={i} className={styles['field']}>
                <span aria-hidden="true" className={styles['swatch']} data-colour={i + 1} />
                <label className="visually-hidden" htmlFor={`part-${i}`}>
                  {copy.field(i + 1)}
                </label>
                <input
                  id={`part-${i}`}
                  className={styles['input']}
                  value={name}
                  maxLength={PART_LABEL_MAX}
                  placeholder={copy.field(i + 1)}
                  autoComplete="off"
                  onChange={(e) => setNames(names.map((n, j) => (j === i ? e.target.value : n)))}
                />
              </li>
            ))}
          </ol>
          <div role="group" aria-label={copy.ideas} className={styles['ideas']}>
            {copy.suggestions
              .filter((idea) => !used.has(idea.toLowerCase()))
              .map((idea) => (
                <button
                  key={idea}
                  type="button"
                  className={chip['chip']}
                  onClick={() => fill(idea)}
                >
                  {idea}
                </button>
              ))}
          </div>
          <Button
            type="submit"
            disabled={!ready}
            aria-describedby={ready ? undefined : 'setup-need'}
          >
            {copy.next}
          </Button>
          <div aria-live="polite">
            {!ready && (
              <p id="setup-need" className={shell['muted']}>
                {copy.needOne}
              </p>
            )}
            {unsaved && <p className={shell['muted']}>{copy.unsaved}</p>}
          </div>
        </form>
      </main>
    </div>
  );
}
