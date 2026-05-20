import { sessionCache, localCache, CACHE_KEYS } from './cache';

interface ApiResponse<T> {
  data: T;
  cached?: boolean;
}

interface AuthResponse {
  sessionId: string;
  user: {
    id: string;
    name: string;
    avatarColor: string;
    role: string;
    permissions: string[];
  };
}

class ApiClient {
  private baseUrl = '/api';

  private getSessionId(): string | null {
    return sessionCache.get(CACHE_KEYS.authSession);
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    const sessionId = this.getSessionId();
    if (sessionId) {
      headers['X-Session-Id'] = sessionId;
    }
    return headers;
  }

  async get<T>(endpoint: string, useCache = true): Promise<T> {
    if (useCache) {
      const cached = sessionCache.get<T>(endpoint);
      if (cached) {
        console.log(`[Cache] GET ${endpoint}`);
        return cached;
      }
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const result = await response.json() as ApiResponse<T>;
    
    if (useCache && result.data) {
      const ttl = endpoint.includes('summary') ? 120000 : 60000;
      sessionCache.set(endpoint, result.data, ttl);
    }

    return result.data;
  }

  async post<T>(endpoint: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  // Auth methods
  async login(name: string, email?: string): Promise<AuthResponse> {
    const response = await this.post<{ data: AuthResponse; sessionId: string }>('/auth/login', { name, email });
    sessionCache.set(CACHE_KEYS.authSession, response.sessionId);
    return response.data;
  }

  async logout(): Promise<void> {
    const sessionId = this.getSessionId();
    if (sessionId) {
      try {
        await this.post('/auth/logout', {});
      } catch {}
      sessionCache.remove(CACHE_KEYS.authSession);
    }
  }

  async validateSession(): Promise<{ valid: boolean; user: AuthResponse['user'] | null }> {
    const sessionId = this.getSessionId();
    if (!sessionId) {
      return { valid: false, user: null };
    }
    
    try {
      return await this.get(`/auth/validate?sessionId=${sessionId}`);
    } catch {
      return { valid: false, user: null };
    }
  }

  // Board methods
  async getBoards() {
    return this.get<any[]>('/boards');
  }

  async getBoardTasks(boardId: string) {
    return this.get<any[]>(`/boards/${boardId}/tasks`);
  }

  async getBoardMeta(boardId: string) {
    return this.get<any>(`/boards/${boardId}/meta`);
  }

  async getBoardSummary(boardId: string) {
    return this.get<any>(`/boards/${boardId}/summary`);
  }

  async getBoardLogs(boardId: string) {
    return this.get<any[]>(`/boards/${boardId}/logs`);
  }

  // Cache invalidation
  invalidate(endpoint: string): void {
    sessionCache.remove(endpoint);
  }

  invalidateBoard(boardId: string): void {
    sessionCache.remove(`/boards/${boardId}/tasks`);
    sessionCache.remove(`/boards/${boardId}/summary`);
    sessionCache.remove(`/boards/${boardId}/meta`);
    sessionCache.remove(`/boards/${boardId}/logs`);
  }

  // Health check
  async getHealth() {
    return this.get<any>('/health');
  }
}

export const api = new ApiClient();