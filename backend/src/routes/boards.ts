import { Router } from 'express';
import type { CacheService } from '../cache/index.js';
import { CACHE_KEYS } from '../cache/keys.js';
import { CACHE_TTL } from '../cache/ttl.js';
import type { BoardState, Task, ActivityLog } from '../../types.js';

interface BoardInfo {
  id: string;
  name: string;
  taskCount: number;
  lastUpdate: string;
}

export function createBoardsRouter(
  cacheService: CacheService,
  getBoardState: (boardId: string) => BoardState | undefined
) {
  const router = Router();

  // List all boards
  router.get('/', async (req, res) => {
    const boards = await cacheService.getOrSetBoardList(async () => {
      const defaultBoard = getBoardState('default');
      if (!defaultBoard) return [];
      
      const boardInfo: BoardInfo = {
        id: 'default',
        name: 'Main Board',
        taskCount: defaultBoard.tasks.length,
        lastUpdate: defaultBoard.tasks[0]?.updatedAt || new Date().toISOString()
      };
      
      return [boardInfo];
    });
    res.json({ data: boards });
  });

  // Get board info
  router.get('/:boardId', async (req, res) => {
    const { boardId } = req.params;
    const board = getBoardState(boardId);
    
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }
    
    res.json({ 
      data: {
        id: boardId,
        name: 'Main Board',
        taskCount: board.tasks.length,
        lastUpdate: board.tasks[0]?.updatedAt || new Date().toISOString()
      }
    });
  });

  // Get board tasks
  router.get('/:boardId/tasks', async (req, res) => {
    const { boardId } = req.params;
    
    let tasks = await cacheService.getTasks(boardId);
    if (!tasks) {
      const board = getBoardState(boardId);
      tasks = board ? board.tasks : [];
      if (tasks.length > 0) {
        await cacheService.setTasks(boardId, tasks);
      }
    }
    
    res.json({ data: tasks || [] });
  });

  // Get board metadata
  router.get('/:boardId/meta', async (req, res) => {
    const { boardId } = req.params;
    
    let meta = await cacheService.getBoardMeta(boardId);
    if (!meta) {
      const board = getBoardState(boardId);
      meta = { 
        taskCount: board?.tasks.length || 0, 
        lastUpdate: board?.tasks[0]?.updatedAt || new Date().toISOString()
      };
      await cacheService.setBoardMeta(boardId, meta);
    }
    
    res.json({ data: meta });
  });

  // Get board logs
  router.get('/:boardId/logs', async (req, res) => {
    const { boardId } = req.params;
    
    let logs = await cacheService.getLogs(boardId);
    if (!logs) {
      const board = getBoardState(boardId);
      logs = board ? board.logs : [];
      if (logs.length > 0) {
        await cacheService.setLogs(boardId, logs);
      }
    }
    
    res.json({ data: logs || [] });
  });

  // Get board chat
  router.get('/:boardId/chat', async (req, res) => {
    const { boardId } = req.params;
    const board = getBoardState(boardId);
    
    res.json({ data: board?.chat || [] });
  });

  // Get board summary (expensive aggregation)
  router.get('/:boardId/summary', async (req, res) => {
    const { boardId } = req.params;
    
    const summary = await cacheService.getOrSetBoardSummary(boardId, async () => {
      const board = getBoardState(boardId);
      if (!board) {
        return { totalTasks: 0, byColumn: {}, byPriority: {} };
      }
      
      return {
        totalTasks: board.tasks.length,
        byColumn: board.tasks.reduce<Record<string, number>>((acc, t) => {
          acc[t.column] = (acc[t.column] || 0) + 1;
          return acc;
        }, {}),
        byPriority: board.tasks.reduce<Record<string, number>>((acc, t) => {
          acc[t.priority] = (acc[t.priority] || 0) + 1;
          return acc;
        }, {}),
        recentActivity: board.logs.slice(0, 10)
      };
    });
    
    res.json({ data: summary });
  });

  // Get active users for board
  router.get('/:boardId/users', async (req, res) => {
    const { boardId } = req.params;
    const users = await cacheService.getActiveUsers(boardId);
    res.json({ data: users || {} });
  });

  // Clear board cache
  router.delete('/:boardId/cache', async (req, res) => {
    const { boardId } = req.params;
    await cacheService.invalidateBoard(boardId);
    res.json({ success: true, message: `Cache cleared for board ${boardId}` });
  });

  return router;
}