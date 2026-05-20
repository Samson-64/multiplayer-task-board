import { v4 as uuidv4 } from 'uuid';
import type { AuthUser, SessionData, LoginCredentials, AuthResponse } from './types.js';
import type { CacheService } from '../cache/index.js';

const AVATAR_COLORS = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
  'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
  'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
  'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500'
];

export class AuthManager {
  private cacheService: CacheService;

  constructor(cacheService: CacheService) {
    this.cacheService = cacheService;
  }

  async login(credentials: LoginCredentials, sessionId?: string): Promise<AuthResponse> {
    const sid = sessionId || uuidv4();
    const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    
    const user: AuthUser = {
      id: uuidv4(),
      name: credentials.name,
      email: credentials.email,
      avatarColor,
      role: 'member',
      permissions: ['read', 'write', 'delete'],
      workspaceId: 'default'
    };

    const sessionData: SessionData = {
      id: sid,
      userId: user.id,
      user,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      expiresAt: Date.now() + 86400000 // 24 hours
    };

    await this.cacheService.setUserSession(sid, sessionData as unknown as object);
    await this.cacheService.setUserPermissions(user.id, user.permissions);

    return { sessionId: sid, user };
  }

  async validateSession(sessionId: string): Promise<SessionData | null> {
    const session = await this.cacheService.getUserSession(sessionId) as SessionData | null;
    
    if (!session) return null;
    
    if (Date.now() > session.expiresAt) {
      await this.cacheService.invalidateSession(sessionId);
      return null;
    }

    session.lastActivity = Date.now();
    await this.cacheService.setUserSession(sessionId, session as unknown as object);
    
    return session;
  }

  async logout(sessionId: string): Promise<void> {
    await this.cacheService.invalidateSession(sessionId);
  }

  async refreshSession(sessionId: string): Promise<SessionData | null> {
    const session = await this.validateSession(sessionId);
    if (!session) return null;

    session.expiresAt = Date.now() + 86400000;
    session.lastActivity = Date.now();
    await this.cacheService.setUserSession(sessionId, session as unknown as object);
    
    return session;
  }
}