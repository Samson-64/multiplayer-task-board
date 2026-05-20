import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { AuthManager } from '../auth/manager.js';

export function createAuthRouter(authManager: AuthManager) {
  const router = Router();

  // Login
  router.post('/login', async (req, res) => {
    const { name, email } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const sessionId = req.headers['x-session-id'] as string || uuidv4();
    
    const result = await authManager.login({ name, email }, sessionId);
    
    res.json({ 
      data: result,
      sessionId: result.sessionId
    });
  });

  // Logout
  router.post('/logout', async (req, res) => {
    const sessionId = req.headers['x-session-id'] as string;
    
    if (sessionId) {
      await authManager.logout(sessionId);
    }
    
    res.json({ success: true });
  });

  // Validate session
  router.get('/validate', async (req, res) => {
    const sessionId = req.headers['x-session-id'] as string;
    
    if (!sessionId) {
      return res.status(401).json({ valid: false });
    }

    const session = await authManager.validateSession(sessionId);
    
    res.json({ 
      valid: !!session,
      user: session?.user || null
    });
  });

  // Refresh session
  router.post('/refresh', async (req, res) => {
    const sessionId = req.headers['x-session-id'] as string;
    
    if (!sessionId) {
      return res.status(401).json({ error: 'No session provided' });
    }

    const session = await authManager.refreshSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    
    res.json({ 
      data: {
        expiresAt: session.expiresAt
      }
    });
  });

  return router;
}