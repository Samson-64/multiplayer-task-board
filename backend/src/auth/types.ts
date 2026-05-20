export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  avatarColor: string;
  role: 'admin' | 'member' | 'viewer';
  permissions: string[];
  workspaceId: string;
}

export interface SessionData {
  id: string;
  userId: string;
  user: AuthUser;
  createdAt: number;
  lastActivity: number;
  expiresAt: number;
}

export interface LoginCredentials {
  name: string;
  email?: string;
}

export interface AuthResponse {
  sessionId: string;
  user: AuthUser;
}