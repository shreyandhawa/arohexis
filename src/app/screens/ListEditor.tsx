import { useState, type ReactNode } from 'react';
import { lists } from '../../copy/lists';
import { settings } from '../../copy/settings';
import { LABEL_MAX, type ListError } from '../actions/lists';
import { Button } from '../components/Button';
import shell from '../layout/Shell.module.css';
import styles from './SettingsParts.module.css';

export type EditorItem = { id: string; label: string; enabled: boolean };

type Props = {
  items: readonly EditorItem[];
  /** An item that stays on and stays last, such as "Something else". */
  fixedId?: string;
  fixedNote?: string;
  enabledLabel: string;
  addLabel: string;
  onRename(id: string, label: string): Promise<ListError | undefined>;
  onEnabled(id: string, enabled: boolean): Promise<void>;
  onMove(id: string, by: -1 | 1): Promise<void>;
  onAdd(label: string): Promise<ListError | undefined>;
  /** Extra controls inside an item, such as a feeling's responses. */
  renderExtra?(item: EditorItem): ReactNode;
};

function Name({
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
      <label htmlFor={id}>{lists.name}</label>
      <input
        id={id}
        className={styles['input']}
        type="text"
        value={value}
        maxLength={LABEL_MAX + 8}
        aria-invalid={invalid}
        aria-describedby={`${id}-hint`}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
      />
      <p id={`${id}-hint`} className={styles['hint']}>
        {lists.labelHint}
      </p>
    </div>
  );
}

function Item({
  item,
  props,
  first,
  last,
}: {
  item: EditorItem;
  props: Props;
  first: boolean;
  last: boolean;
}) {
  const [draft, setDraft] = useState(item.label);
  const [invalid, setInvalid] = useState(false);
  const [failed, setFailed] = useState(false);
  const fixed = item.id === props.fixedId;

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

  return (
    <li>
      <fieldset className={styles['part']}>
        <legend className={styles['legend']}>{item.label}</legend>
        <Name id={`name-${item.id}`} value={draft} onChange={setDraft} invalid={invalid} />
        <div>
          <Button
            variant="quiet"
            onClick={() =>
              void run(() => props.onRename(item.id, draft)).then((e) => setInvalid(e === 'label'))
            }
          >
            {lists.save}
          </Button>
        </div>
        {!fixed && (
          <div className={styles['row']}>
            <Button
              variant="quiet"
              disabled={first}
              aria-label={lists.moveUp(item.label)}
              onClick={() => void run(() => props.onMove(item.id, -1))}
            >
              ↑
            </Button>
            <Button
              variant="quiet"
              disabled={last}
              aria-label={lists.moveDown(item.label)}
              onClick={() => void run(() => props.onMove(item.id, 1))}
            >
              ↓
            </Button>
          </div>
        )}
        <label className={styles['toggle']}>
          <input
            type="checkbox"
            checked={fixed ? true : item.enabled}
            disabled={fixed}
            onChange={(e) => void run(() => props.onEnabled(item.id, e.target.checked))}
          />
          {props.enabledLabel}
        </label>
        {fixed && props.fixedNote && <p className={styles['hint']}>{props.fixedNote}</p>}
        {props.renderExtra?.(item)}
        {failed && <p className={styles['hint']}>{settings.saveFailed}</p>}
      </fieldset>
    </li>
  );
}

function Add({ props }: { props: Props }) {
  const [label, setLabel] = useState('');
  const [invalid, setInvalid] = useState(false);

  async function add() {
    try {
      const error = await props.onAdd(label);
      setInvalid(error === 'label');
      if (error === undefined) setLabel('');
    } catch (error) {
      console.error(error);
      setInvalid(true);
    }
  }

  return (
    <section className={styles['part']}>
      <h2 className={shell['subtitle']}>{props.addLabel}</h2>
      <Name id="name-new" value={label} onChange={setLabel} invalid={invalid} />
      <div>
        <Button onClick={() => void add()}>{props.addLabel}</Button>
      </div>
    </section>
  );
}

export function ListEditor(props: Props) {
  // The fixed item is always last; the others keep the order they arrive in.
  const movable = props.items.filter((i) => i.id !== props.fixedId);
  const fixed = props.items.filter((i) => i.id === props.fixedId);
  return (
    <>
      <ul className={styles['list']}>
        {[...movable, ...fixed].map((item) => (
          <Item
            key={`${item.id}:${item.label}:${String(item.enabled)}`}
            item={item}
            props={props}
            first={movable[0]?.id === item.id}
            last={movable[movable.length - 1]?.id === item.id}
          />
        ))}
      </ul>
      <Add props={props} />
    </>
  );
}
