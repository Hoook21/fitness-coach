/* IndexedDB key-value store with transparent localStorage fallback */
const Storage = (() => {
  const DB_NAME = 'fitness-coach';
  const DB_VER  = 1;
  const STORE   = 'kv';
  let _db = null;

  function openDB() {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = e => e.target.result.createObjectStore(STORE, { keyPath: 'k' });
      req.onsuccess = e => { _db = e.target.result; resolve(_db); };
      req.onerror   = () => reject(req.error);
    });
  }

  async function get(key) {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
        req.onsuccess = () => resolve(req.result != null ? req.result.v : null);
        req.onerror   = () => reject(req.error);
      });
    } catch (_) {
      return localStorage.getItem(key);
    }
  }

  async function set(key, value) {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put({ k: key, v: value });
        tx.oncomplete = () => resolve();
        tx.onerror    = () => reject(tx.error);
      });
    } catch (_) {
      localStorage.setItem(key, value);
    }
  }

  async function remove(key) {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror    = () => reject(tx.error);
      });
    } catch (_) {
      localStorage.removeItem(key);
    }
  }

  async function listPrefix(prefix) {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
        req.onsuccess = () =>
          resolve((req.result || []).filter(r => r.k.startsWith(prefix)).map(r => r.k));
        req.onerror = () => reject(req.error);
      });
    } catch (_) {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) keys.push(k);
      }
      return keys;
    }
  }

  async function exportAll() {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror   = () => reject(req.error);
      });
    } catch (_) {
      const items = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) items.push({ k, v: localStorage.getItem(k) });
      }
      return items;
    }
  }

  async function importAll(records) {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        for (const r of records) store.put(r);
        tx.oncomplete = () => resolve();
        tx.onerror    = () => reject(tx.error);
      });
    } catch (_) {
      for (const r of records) localStorage.setItem(r.k, r.v);
    }
  }

  return { get, set, remove, listPrefix, exportAll, importAll };
})();
