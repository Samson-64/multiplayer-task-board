import { RedisCache } from './RedisCache.js';
import { CACHE_KEYS } from './keys.js';
import { CACHE_TTL } from './ttl.js';
import type { Task, ActivityLog, User } from '../../types.js';

export { CACHE_KEYS, CACHE_TTL };

export class CacheService {
  private cache: RedisCache;

  constructor(redisUrl?: string) {
    this.cache = new RedisCache(redisUrl);
  }

  async getStats(): Promise<{ redisConnected: boolean; localCache: { size: number; maxSize: number } }> {
    return this.cache.getStats();
  }

  // ============ Board State Caching ============

  async getTasks(boardId: string): Promise<Task[] | null> {
    return this.cache.get(CACHE_KEYS.boardTasks(boardId));
  }

  async setTasks(boardId: string, tasks: Task[]): Promise<void> {
    await this.cache.set(CACHE_KEYS.boardTasks(boardId), tasks, CACHE_TTL.boardTasks);
  }

  async getBoardMeta(boardId: string): Promise<{ taskCount: number; lastUpdate: string } | null> {
    return this.cache.get(CACHE_KEYS.boardMeta(boardId));
  }

  async setBoardMeta(boardId: string, meta: { taskCount: number; lastUpdate: string }): Promise<void> {
    await this.cache.set(CACHE_KEYS.boardMeta(boardId), meta, CACHE_TTL.boardMeta);
  }

  async getLogs(boardId: string): Promise<ActivityLog[] | null> {
    return this.cache.get(CACHE_KEYS.boardLogs(boardId));
  }

  async setLogs(boardId: string, logs: ActivityLog[]): Promise<void> {
    await this.cache.set(CACHE_KEYS.boardLogs(boardId), logs, CACHE_TTL.boardLogs);
  }

  async getBoardSummary(boardId: string): Promise<object | null> {
    return this.cache.get(CACHE_KEYS.boardSummary(boardId));
  }

  async setBoardSummary(boardId: string, summary: object): Promise<void> {
    await this.cache.set(CACHE_KEYS.boardSummary(boardId), summary, CACHE_TTL.boardSummary);
  }

  async getOrSetBoardSummary(boardId: string, factory: () => Promise<object>): Promise<object> {
    return this.cache.getOrSet(CACHE_KEYS.boardSummary(boardId), factory, CACHE_TTL.boardSummary);
  }

  // ============ Session Caching ============

  async setUserSession(sessionId: string, session: object): Promise<void> {
    await this.cache.set(CACHE_KEYS.session(sessionId), session, CACHE_TTL.session);
  }

  async getUserSession(sessionId: string): Promise<object | null> {
    return this.cache.get(CACHE_KEYS.session(sessionId));
  }

  async setUserPermissions(userId: string, permissions: string[]): Promise<void> {
    await this.cache.set(CACHE_KEYS.userPermissions(userId), permissions, CACHE_TTL.userPermissions);
  }

  async getUserPermissions(userId: string): Promise<string[] | null> {
    return this.cache.get(CACHE_KEYS.userPermissions(userId));
  }

  // ============ Active Users Caching ============

  async setActiveUsers(boardId: string, users: Record<string, User>): Promise<void> {
    await this.cache.set(CACHE_KEYS.activeUsers(boardId), users, 60);
  }

  async getActiveUsers(boardId: string): Promise<Record<string, User> | null> {
    return this.cache.get(CACHE_KEYS.activeUsers(boardId));
  }

  // ============ Board List Caching ============

  async setBoardList(boards: object[]): Promise<void> {
    await this.cache.set(CACHE_KEYS.boardList(), boards, CACHE_TTL.boardList);
  }

  async getBoardList(): Promise<object[] | null> {
    return this.cache.get(CACHE_KEYS.boardList());
  }

  async getOrSetBoardList(factory: () => Promise<object[]>): Promise<object[]> {
    return this.cache.getOrSet(CACHE_KEYS.boardList(), factory, CACHE_TTL.boardList);
  }

  // ============ Invalidation ============

  async invalidateBoard(boardId: string): Promise<void> {
    await this.cache.invalidateBoard(boardId);
  }

  async invalidateSession(sessionId: string): Promise<void> {
    await this.cache.del(CACHE_KEYS.session(sessionId));
  }

  async invalidateAll(): Promise<void> {
    await this.cache.del('*');
  }
}