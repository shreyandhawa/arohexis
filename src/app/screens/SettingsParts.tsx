import { useState } from 'react';
import { parts as copy } from '../../copy/parts';
import { settings } from '../../copy/settings';
import type { ColourId, Part } from '../../domain/config';
import { MAX_PARTS, PART_LABEL_MAX } from '../../domain/parts';
import { addPart, recolorPart, renamePart, setPartEnabled } from '../actions/parts';
import { Button } from '../components/Button';
import { useData } from '../data/DataProvider';
import { useConfig } from '../hooks/useConfig';
import shell from '../layout/Shell.module.css';
import styles from './SettingsParts.module.css';

const COLOURS: readonly ColourId[] = [1, 2, 3, 4, 5, 6];

function NameField({
  id,
  value,
  onChange,
  invalid,
}: {
  id: string;
  value: string;
  onChange(value: string): void;
  invalid: boolean;
}) {
  return (
    <div className={styles['field']}>
      <label htmlFor={id}>{copy.name}</label>
      <input
        id={id}
        className={styles['input']}
        type="text"
        value={value}
        maxLength={PART_LABEL_MAX + 8}
        aria-invalid={invalid}
        aria-describedby={`${id}-hint`}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
      />
      <p id={`${id}-hint`} className={styles['hint']}>
        {copy.labelHint}
      </p>
    </div>
  );
}

function PartEditor({ part }: { part: Part }) {
  const deps = useData();
  const [draft, setDraft] = useState(part.label);
  const [invalid, setInvalid] = useState(false);
  const [failed, setFailed] = useState(false);

  async function run(action: () => Promise<unknown>): Promise<unknown> {
    setFailed(false);
    try {
      return await action();
    } catch (error) {
      console.error(error);
      setFailed(true);
      return undefined;
    }
  }

  async function save() {
    const error = await run(() => renamePart(deps, part.id, draft));
    setInvalid(error === 'label');
  }

  return (
    <li>
      <fieldset className={styles['part']}>
        <legend className={styles['legend']}>{part.label}</legend>
        <NameField id={`name-${part.id}`} value={draft} onChange={setDraft} invalid={invalid} />
        <div>
          <Button variant="quiet" onClick={() => void save()}>
            {copy.save}
          </Button>
        </div>
        <fieldset className={styles['colors']}>
          <legend className={styles['colorsLabel']}>{copy.color}</legend>
          {COLOURS.map((c) => (
            <button
              key={c}
              type="button"
              className={styles['swatch']}
              aria-label={copy.colorName(c)}
              aria-pressed={part.colour === c}
              onClick={() => void run(() => recolorPart(deps, part.id, c))}
            >
              <span aria-hidden="true" className={styles['dot']} data-colour={c} />
            </button>
          ))}
        </fieldset>
        <label className={styles['toggle']}>
          <input
            type="checkbox"
            checked={part.enabled}
            onChange={(e) => void run(() => setPartEnabled(deps, part.id, e.target.checked))}
          />
          {copy.enabled}
        </label>
        {failed && <p className={styles['hint']}>{settings.saveFailed}</p>}
      </fieldset>
    </li>
  );
}

function AddPart() {
  const deps = useData();
  const [label, setLabel] = useState('');
  const [invalid, setInvalid] = useState(false);

  async function add() {
    try {
      const error = await addPart(deps, label);
      setInvalid(error === 'label');
      if (error === undefined) setLabel('');
    } catch (error) {
      console.error(error);
      setInvalid(true);
    }
  }

  return (
    <section className={styles['part']}>
      <h2 className={shell['subtitle']}>{copy.add}</h2>
      <NameField id="name-new" value={label} onChange={setLabel} invalid={invalid} />
      <div>
        <Button onClick={() => void add()}>{copy.add}</Button>
      </div>
    </section>
  );
}

export function SettingsParts() {
  const config = useConfig();
  const parts = [...(config?.parts ?? [])].sort((a, b) => a.order - b.order);
  return (
    <div className={styles['screen']}>
      <h1 className={shell['title']}>{copy.title}</h1>
      <p className={shell['muted']}>{copy.intro}</p>
      {config && (
        <>
          <ul className={styles['list']}>
            {parts.map((p) => (
              <PartEditor key={`${p.id}:${p.label}`} part={p} />
            ))}
          </ul>
          {parts.length >= MAX_PARTS ? <p className={shell['muted']}>{copy.limit}</p> : <AddPart />}
        </>
      )}
    </div>
  );
}
