import { useState } from 'react';
import { basisLabels, feelingsEditor as copy, lists } from '../../copy/lists';
import { settings } from '../../copy/settings';
import type { FeelingResponse } from '../../domain/config';
import { BASIS_SOURCES, OTHER_FEELING_ID } from '../../domain/defaults';
import type { Basis } from '../../domain/events';
import { wordCount } from '../../copy/rules';
import {
  addFeeling,
  addResponse,
  bodyError,
  editResponse,
  moveFeeling,
  renameFeeling,
  RESPONSE_WORDS_MAX,
  setFeelingEnabled,
} from '../actions/lists';
import { Button } from '../components/Button';
import { useData } from '../data/DataProvider';
import { useConfig } from '../hooks/useConfig';
import shell from '../layout/Shell.module.css';
import { ListEditor } from './ListEditor';
import styles from './SettingsParts.module.css';

const BASES = Object.keys(BASIS_SOURCES) as Basis[];

function BasisPicker({
  id,
  value,
  onChange,
}: {
  id: string;
  value: Basis;
  onChange(basis: Basis): void;
}) {
  return (
    <div className={styles['field']}>
      <label htmlFor={id}>{copy.basis}</label>
      <select
        id={id}
        className={styles['input']}
        value={value}
        onChange={(e) => onChange(e.target.value as Basis)}
      >
        {BASES.map((b) => (
          <option key={b} value={b}>
            {basisLabels[b]}
          </option>
        ))}
      </select>
      <p className={styles['hint']}>{copy.source(BASIS_SOURCES[value])}</p>
    </div>
  );
}

function BodyField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange(value: string): void;
}) {
  const over = wordCount(value) > RESPONSE_WORDS_MAX;
  return (
    <div className={styles['field']}>
      <label htmlFor={id}>{copy.responseText}</label>
      <textarea
        id={id}
        className={styles['input']}
        rows={4}
        value={value}
        aria-invalid={over}
        aria-describedby={`${id}-count`}
        onChange={(e) => onChange(e.target.value)}
      />
      <p id={`${id}-count`} className={styles['hint']}>
        {copy.wordCount(wordCount(value))}
        {over && ` ${copy.overCap}`}
      </p>
    </div>
  );
}

function ResponseEditor({ response }: { response: FeelingResponse }) {
  const deps = useData();
  const [body, setBody] = useState(response.body);
  const [failed, setFailed] = useState(false);
  const id = `response-${response.id}`;

  async function run(change: { body?: string; basis?: Basis; enabled?: boolean }) {
    setFailed(false);
    try {
      await editResponse(deps, response.id, change);
    } catch (error) {
      console.error(error);
      setFailed(true);
    }
  }

  return (
    <li className={styles['part']}>
      <BodyField id={`${id}-body`} value={body} onChange={setBody} />
      <div>
        <Button variant="quiet" disabled={bodyError(body)} onClick={() => void run({ body })}>
          {lists.save}
        </Button>
      </div>
      <BasisPicker
        id={`${id}-basis`}
        value={response.basis}
        onChange={(basis) => void run({ basis })}
      />
      <label className={styles['toggle']}>
        <input
          type="checkbox"
          checked={response.enabled}
          onChange={(e) => void run({ enabled: e.target.checked })}
        />
        {copy.responseEnabled}
      </label>
      {failed && <p className={styles['hint']}>{settings.saveFailed}</p>}
    </li>
  );
}

function AddResponse({ feelingId }: { feelingId: string }) {
  const deps = useData();
  const [body, setBody] = useState('');
  const [basis, setBasis] = useState<Basis>('shrink-the-step');
  const [failed, setFailed] = useState(false);

  async function add() {
    setFailed(false);
    try {
      const error = await addResponse(deps, feelingId, body, basis);
      if (error === undefined) setBody('');
    } catch (error) {
      console.error(error);
      setFailed(true);
    }
  }

  return (
    <div className={styles['part']}>
      <h3 className={shell['subtitle']}>{copy.newResponse}</h3>
      <BodyField id={`new-body-${feelingId}`} value={body} onChange={setBody} />
      <BasisPicker id={`new-basis-${feelingId}`} value={basis} onChange={setBasis} />
      <div>
        <Button disabled={bodyError(body)} onClick={() => void add()}>
          {copy.addResponse}
        </Button>
      </div>
      {failed && <p className={styles['hint']}>{settings.saveFailed}</p>}
    </div>
  );
}

export function SettingsFeelings() {
  const deps = useData();
  const config = useConfig();
  const items = [...(config?.feelings ?? [])].sort((a, b) => a.order - b.order);
  const responses = [...(config?.responses ?? [])].sort((a, b) => a.order - b.order);
  return (
    <div className={styles['screen']}>
      <h1 className={shell['title']}>{copy.title}</h1>
      <p className={shell['muted']}>{copy.intro}</p>
      {config && (
        <ListEditor
          items={items}
          fixedId={OTHER_FEELING_ID}
          fixedNote={copy.alwaysOn}
          enabledLabel={copy.enabled}
          addLabel={copy.add}
          onRename={(id, label) => renameFeeling(deps, id, label)}
          onEnabled={(id, on) => setFeelingEnabled(deps, id, on)}
          onMove={(id, by) => moveFeeling(deps, id, by)}
          onAdd={(label) => addFeeling(deps, label)}
          renderExtra={(item) => {
            if (item.id === OTHER_FEELING_ID)
              return <p className={styles['hint']}>{copy.otherResponses}</p>;
            const mine = responses.filter((r) => r.feelingId === item.id);
            return (
              <details>
                <summary className={styles['summary']}>{copy.responses(mine.length)}</summary>
                <ul className={styles['list']}>
                  {mine.map((r) => (
                    <ResponseEditor key={`${r.id}:${r.body}:${r.basis}`} response={r} />
                  ))}
                </ul>
                {mine.length === 0 && <p className={styles['hint']}>{copy.none}</p>}
                <AddResponse feelingId={item.id} />
              </details>
            );
          }}
        />
      )}
    </div>
  );
}
