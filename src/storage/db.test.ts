import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { expect, it, vi } from 'vitest';
import { ArohexisDB } from './db';

it('calls onVersionChange after closing when another connection upgrades', async () => {
  const name = `test-${crypto.randomUUID()}` as const;
  const onVersionChange = vi.fn();
  const db = new ArohexisDB(name, { onVersionChange });
  await db.open();
  const other = new Dexie(name);
  other.version(Math.round(db.verno) + 1).stores({ kv: 'key' });
  await other.open();
  expect(onVersionChange).toHaveBeenCalledTimes(1);
  expect(db.isOpen()).toBe(false);
  other.close();
  await Dexie.delete(name);
});
