/** Petit stockage clé/valeur sur IndexedDB (sert aux sprites importés, trop gros pour localStorage). */
const DB_NAME = 'fighting-friends';
const STORE = 'kv';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function run<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = action(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
  });
}

export const kvStore = {
  set: (key: string, value: unknown) => run('readwrite', (s) => s.put(value, key)),
  delete: (key: string) => run('readwrite', (s) => s.delete(key)),
  async entries<T>(): Promise<{ key: string; value: T }[]> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const out: { key: string; value: T }[] = [];
      const tx = db.transaction(STORE, 'readonly');
      const cursorRequest = tx.objectStore(STORE).openCursor();
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) return;
        out.push({ key: String(cursor.key), value: cursor.value as T });
        cursor.continue();
      };
      tx.oncomplete = () => resolve(out);
      tx.onerror = () => reject(tx.error);
    });
  },
};
