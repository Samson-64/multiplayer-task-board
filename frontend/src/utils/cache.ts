type CacheValue<T> = {
  data: T;
  expiresAt: number;
};

class StorageCache {
  constructor(private storage: Storage) {}

  get<T>(key: string): T | null {
    try {
      const item = this.storage.getItem(key);
      if (!item) return null;
      const cached = JSON.parse(item) as CacheValue<T>;
      if (Date.now() > cached.expiresAt) {
        this.storage.removeItem(key);
        return null;
      }
      return cached.data;
    } catch { return null; }
  }

  set<T>(key: string, data: T, ttlMs = 3600000): void {
    this.storage.setItem(key, JSON.stringify({
      data,
      expiresAt: Date.now() + ttlMs
    }));
  }

  remove(key: string): void {
    this.storage.removeItem(key);
  }

  clear(): void {
    this.storage.clear();
  }
}

export const sessionCache = new StorageCache(sessionStorage);
export const localCache = new StorageCache(localStorage);

export const CACHE_KEYS = {
  authSession: 'mtb:auth:session',
  boardSummary: (id: string) => `mtb:board:${id}:summary`,
  boardMeta: (id: string) => `mtb:board:${id}:meta`,
  boardTasks: (id: string) => `mtb:board:${id}:tasks`,
  boardList: 'mtb:boards:list',
  preferences: 'mtb:preferences',
};