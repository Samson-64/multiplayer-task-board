import { Router } from 'express';
import { createAuthRouter } from './auth.js';
import { createBoardsRouter } from './boards.js';
import type { CacheService } from '../cache/index.js';
import type { AuthManager } from '../auth/manager.js';
import type { BoardState } from '../../types.js';

export function createApiRouter(
  cacheService: CacheService,
  authManager: AuthManager,
  getBoardState: (boardId: string) => BoardState | undefined
) {
  const router = Router();

  // Health check with cache stats
  router.get('/health', async (req, res) => {
    const stats = await cacheService.getStats();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      cache: stats
    });
  });

  // Mount routers
  router.use('/auth', createAuthRouter(authManager));
  router.use('/boards', createBoardsRouter(cacheService, getBoardState));

  // Cache management endpoints
  router.post('/cache/clear', async (req, res) => {
    const { boardId, pattern } = req.body;
    
    if (boardId) {
      await cacheService.invalidateBoard(boardId);
      res.json({ success: true, message: `Cache cleared for board ${boardId}` });
    } else if (pattern) {
      await cacheService.invalidateAll();
      res.json({ success: true, message: 'All cache cleared' });
    } else {
      res.status(400).json({ error: 'Specify boardId or pattern' });
    }
  });

  // Get cache stats
  router.get('/cache/stats', async (req, res) => {
    const stats = await cacheService.getStats();
    res.json({ data: stats });
  });

  return router;
}