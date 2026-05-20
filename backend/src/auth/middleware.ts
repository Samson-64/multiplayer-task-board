import type { Request, Response, NextFunction } from 'express';
import type { AuthManager } from './manager.js';
import type { SessionData } from './types.js';

declare global {
  namespace Express {
    interface Request {
      session?: SessionData;
    }
  }
}

export function createAuthMiddleware(authManager: AuthManager) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const sessionId = req.headers['x-session-id'] as string || 
                      (req.query.sessionId as string);

    if (!sessionId) {
      return res.status(401).json({ error: 'No session provided' });
    }

    const session = await authManager.validateSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    req.session = session;
    next();
  };
}

export function optionalAuth(authManager: AuthManager) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const sessionId = req.headers['x-session-id'] as string ||
                      (req.query.sessionId as string);
    
    if (sessionId) {
      const session = await authManager.validateSession(sessionId);
      if (session) {
        req.session = session;
      }
    }
    
    next();
  };
}