import Redis from 'ioredis';
import { LRUCache } from './LRUCache.js';

export class RedisCache {
  private redis: Redis;
  private localCache: LRUCache<unknown>;
  private connected = false;

  constructor(redisUrl?: string, localCacheSize = 500) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379', {
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: 3,
    });

    this.localCache = new LRUCache(localCacheSize, 60000);

    this.redis.on('connect', () => {
      this.connected = true;
      console.log('✅ Redis connected');
    });

    this.redis.on('error', (err) => {
      this.connected = false;
      console.error('❌ Redis error:', err.message);
    });
  }

  isConnected(): boolean {
    return this.connected;
  }

  async get<T>(key: string): Promise<T | null> {
    const local = this.localCache.get(key) as T | null;
    if (local !== null) {
      return local;
    }

    try {
      const data = await this.redis.get(key);
      if (data) {
        const parsed = JSON.parse(data) as T;
        this.localCache.set(key, parsed, 30000);
        return parsed;
      }
    } catch (err) {
      console.warn('Redis get failed, using local cache:', err);
    }

    return null;
  }

  async set(key: string, value: unknown, ttl = 300): Promise<void> {
    this.localCache.set(key, value, ttl * 1000);

    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } catch (err) {
      console.warn('Redis set failed:', err);
    }
  }

  async del(pattern: string): Promise<void> {
    this.localCache.clear(pattern);

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (err) {
      console.warn('Redis delete failed:', err);
    }
  }

  async getOrSet<T>(key: string, factory: () => Promise<T>, ttl = 300): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  async invalidateBoard(boardId: string): Promise<void> {
    await this.del(`board:${boardId}:*`);
  }

  async getStats(): Promise<{ redisConnected: boolean; localCache: ReturnType<LRUCache<unknown>['stats']> }> {
    return {
      redisConnected: this.connected,
      localCache: this.localCache.stats()
    };
  }
}