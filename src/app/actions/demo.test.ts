import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { testDeps } from '../../domain/testing/fixtures';
import { enterDemo } from './demo';

describe('enterDemo', () => {
  it('does not hang when another tab holds an older version', async () => {
    const holder = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('arohexis-demo', 10);
      req.onupgradeneeded = () => req.result.createObjectStore('kv');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    holder.onversionchange = () => undefined; // never lets go
    await expect(enterDemo({ clock: testDeps().clock }, 100)).rejects.toThrow();
    holder.close();
  });
});
