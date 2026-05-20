import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import session from 'express-session';
import { BoardState, User, SocketMessage } from './types.js';
import { CacheService } from './src/cache/index.js';
import { AuthManager } from './src/auth/manager.js';
import { createApiRouter } from './src/routes/api.js';
import { validateEnvironment, getSessionSecret, getRedisUrl } from './src/utils/validateEnv.js';
import { corsMiddleware, generalLimiter, authLimiter, helmetMiddleware, validateCorsConfig } from './src/middleware/security.js';

validateEnvironment();
validateCorsConfig();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const DB_FILE = path.join(__dirname, '..', 'data-store.json');

const DEFAULT_BOARD_STATE: BoardState = {
  tasks: [
    {
      id: "t1",
      title: "Build real-time WebSocket synchronization engine",
      description: "Construct standard Node.js server event routers to handle drag-and-drop actions, presence syncing, cursor positioning, and live task editing.",
      column: "inprogress",
      priority: "high",
      tags: ["Sockets", "Backend"],
      comments: [
        {
          id: "cmt1",
          userName: "Wired Fox",
          avatarColor: "bg-teal-500",
          text: "WebSocket setup runs perfectly on shared port 3000!",
          createdAt: new Date(Date.now() - 3600000).toISOString()
        }
      ],
      checklist: [
        { id: "c1", text: "Set up Express and ws WebSocketServer on port 3000", completed: true },
        { id: "c2", text: "Integrate broadcast loop for collaborative mouse cursors", completed: true },
        { id: "c3", text: "Add local JSON file-based database persistence", completed: true }
      ],
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "t2",
      title: "Establish unified styling theme",
      description: "Polished warm twilight aesthetics using Tailwind. Incorporate fluid board columns, user presence indicators, and interactive sidebar timelines.",
      column: "todo",
      priority: "medium",
      tags: ["UI Design", "Tailwind v4"],
      comments: [],
      checklist: [
        { id: "c4", text: "Choose high-contrast typography and subtle negative space patterns", completed: false }
      ],
      createdAt: new Date(Date.now() - 43200000).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "t3",
      title: "Verify robust board sync validations",
      description: "Ensure update idempotency prevents race conditions or overlapping states during simultaneous column movements.",
      column: "review",
      priority: "high",
      tags: ["Security", "Quality"],
      comments: [],
      checklist: [],
      createdAt: new Date(Date.now() - 20000000).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "t4",
      title: "Configure bundle bundling routines",
      description: "Ensure esbuild successfully bundles CSS and custom server runtimes for solid deployment outputs.",
      column: "done",
      priority: "low",
      tags: ["Configuration", "Node"],
      comments: [],
      checklist: [],
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  logs: [
    {
      id: "log1",
      userId: "system",
      userName: "System Engine",
      avatarColor: "bg-gray-700",
      action: "initialized board parameters and loaded default kanban records",
      timestamp: new Date().toISOString()
    }
  ],
  chat: [
    {
      id: "chat1",
      userId: "system",
      userName: "System Bot",
      avatarColor: "bg-gray-100",
      text: "👋 Welcome! Anyone who connects to this board gets real-time synchronization on mouse coordinates, board moves, chats, and active tasks. Try opening this in another browser window!",
      timestamp: new Date().toISOString()
    }
  ]
};

// Multi-board support
const boards = new Map<string, BoardState>();
const DEFAULT_BOARD_ID = 'default';

function loadDatabase(): BoardState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const loaded = JSON.parse(content);
      if (loaded && Array.isArray(loaded.tasks) && Array.isArray(loaded.logs) && Array.isArray(loaded.chat)) {
        console.log("Database loaded successfully from " + DB_FILE);
        return loaded;
      }
    }
  } catch (error) {
    console.error("Failed to load DB file:", error);
  }
  return { ...DEFAULT_BOARD_STATE };
}

function saveDatabase(boardState: BoardState) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(boardState, null, 2), 'utf-8');
  } catch (err) {
    console.error("Failed to save DB file:", err);
  }
}

// Initialize board
boards.set(DEFAULT_BOARD_ID, loadDatabase());

function getBoard(boardId: string): BoardState | undefined {
  return boards.get(boardId);
}

function getBoardState(boardId: string): BoardState {
  return boards.get(boardId) || boards.get(DEFAULT_BOARD_ID)!;
}

// Initialize services
const cacheService = new CacheService(getRedisUrl());
const authManager = new AuthManager(cacheService);

// Session middleware
const sessionMiddleware = session({
  secret: getSessionSecret(),
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 86400000,
    sameSite: 'strict'
  }
});

async function startServer() {
  const app = express();
  
  // Security middleware
  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(generalLimiter);
  
  // Body parsing
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));
  
  // Session middleware
  app.use(sessionMiddleware);

  // Apply auth limiter to auth routes
  app.use('/api/auth', authLimiter);
  
  // Add API routes
  app.use('/api', createApiRouter(cacheService, authManager, getBoardState));

  const activeUsers: { [id: string]: User } = {};
  const userCursors: { [userId: string]: { userName: string; avatarColor: string; x: number; y: number; lastActive: number } } = {};

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  const broadcast = (message: SocketMessage, excludeSocket?: any) => {
    const payload = JSON.stringify(message);
    wss.clients.forEach((client) => {
      if (client.readyState === 1 && client !== excludeSocket) {
        client.send(payload);
      }
    });
  };

  wss.on('connection', (ws) => {
    console.log('Client connected. Total clients:', wss.clients.size);
    let myUserId: string | null = null;

    ws.on('message', async (rawData) => {
      try {
        const msg = JSON.parse(rawData.toString()) as SocketMessage;
        const boardId = (msg as any).boardId || DEFAULT_BOARD_ID;
        const boardState = getBoardState(boardId);

        switch (msg.type) {
          case 'user:join': {
            const { id, name, avatarColor } = msg.payload;
            myUserId = id;

            activeUsers[id] = {
              id,
              name,
              avatarColor,
              activeTaskId: null,
              isTyping: false
            };

            const joinLog = {
              id: 'join-' + Math.random().toString(36).substr(2, 9),
              userId: id,
              userName: name,
              avatarColor,
              action: "joined the server",
              timestamp: new Date().toISOString()
            };
            boardState.logs.unshift(joinLog);
            if (boardState.logs.length > 50) boardState.logs.pop();
            saveDatabase(boardState);

            // Update cache
            await cacheService.setActiveUsers(boardId, activeUsers);

            ws.send(JSON.stringify({
              type: 'init',
              payload: {
                board: boardState,
                activeUsers,
                boardId
              }
            }));

            broadcast({
              type: 'user:join',
              payload: { id, name, avatarColor },
              boardId
            }, ws);

            broadcast({
              type: 'users:sync',
              payload: activeUsers
            });
            break;
          }

          case 'user:update': {
            if (myUserId) {
              const updated = msg.payload;
              activeUsers[myUserId] = {
                ...activeUsers[myUserId],
                ...updated
              };

              await cacheService.setActiveUsers(boardId, activeUsers);

              broadcast({
                type: 'users:sync',
                payload: activeUsers
              }, ws);
            }
            break;
          }

          case 'task:upsert': {
            const { task, userId, userName, avatarColor } = msg.payload;

            const idx = boardState.tasks.findIndex(t => t.id === task.id);
            let logAction = '';

            if (idx >= 0) {
              const prev = boardState.tasks[idx];
              boardState.tasks[idx] = task;
              if (prev.column !== task.column) {
                const mapCol: { [k: string]: string } = {
                  todo: '📍 To Do',
                  inprogress: '⚡ In Progress',
                  review: '🔍 Under Review',
                  done: '✅ Done'
                };
                logAction = `moved task "${task.title}" to ${mapCol[task.column] || task.column}`;
              } else if (prev.title !== task.title) {
                logAction = `renamed task to "${task.title}"`;
              } else {
                logAction = `updated task details for "${task.title}"`;
              }
            } else {
              boardState.tasks.unshift(task);
              logAction = `created new task "${task.title}"`;
            }

            const newLog = {
              id: 'log-' + Math.random().toString(36).substr(2, 9),
              userId,
              userName,
              avatarColor,
              action: logAction,
              timestamp: new Date().toISOString()
            };
            boardState.logs.unshift(newLog);
            if (boardState.logs.length > 50) boardState.logs.pop();

            saveDatabase(boardState);

            // Update cache
            await cacheService.setTasks(boardId, boardState.tasks);
            await cacheService.setLogs(boardId, boardState.logs);
            await cacheService.setBoardMeta(boardId, {
              taskCount: boardState.tasks.length,
              lastUpdate: task.updatedAt
            });

            broadcast({
              type: 'board:sync',
              payload: {
                board: boardState,
                actionBy: userId
              },
              boardId
            });
            break;
          }

          case 'task:delete': {
            const { taskId, title, userId, userName, avatarColor } = msg.payload;

            const prevCount = boardState.tasks.length;
            boardState.tasks = boardState.tasks.filter(t => t.id !== taskId);

            if (boardState.tasks.length < prevCount) {
              const deleteLog = {
                id: 'log-' + Math.random().toString(36).substr(2, 9),
                userId,
                userName,
                avatarColor,
                action: `deleted task "${title}"`,
                timestamp: new Date().toISOString()
              };
              boardState.logs.unshift(deleteLog);
              if (boardState.logs.length > 50) boardState.logs.pop();
              saveDatabase(boardState);

              // Invalidate cache
              await cacheService.invalidateBoard(boardId);

              broadcast({
                type: 'board:sync',
                payload: {
                  board: boardState,
                  actionBy: userId
                },
                boardId
              });
            }
            break;
          }

          case 'chat:message': {
            const { message } = msg.payload;
            boardState.chat.push(message);
            if (boardState.chat.length > 100) boardState.chat.shift();
            saveDatabase(boardState);

            // Update cache
            await cacheService.setLogs(boardId, boardState.logs);

            broadcast({
              type: 'chat:message',
              payload: { message }
            });
            break;
          }

          case 'cursor:move': {
            const { userId, userName, avatarColor, x, y } = msg.payload;
            userCursors[userId] = {
              userName,
              avatarColor,
              x,
              y,
              lastActive: Date.now()
            };

            broadcast({
              type: 'cursor:move',
              payload: { userId, userName, avatarColor, x, y }
            }, ws);
            break;
          }
        }
      } catch (err) {
        console.error('WebSocket parsing or operation error:', err);
      }
    });

    ws.on('close', async () => {
      if (myUserId) {
        const userName = activeUsers[myUserId]?.name || 'Unknown User';
        const userAvatar = activeUsers[myUserId]?.avatarColor || 'bg-gray-500';

        delete activeUsers[myUserId];
        delete userCursors[myUserId];

        const boardId = DEFAULT_BOARD_ID;
        const boardState = getBoardState(boardId);

        const leaveLog = {
          id: 'leave-' + Math.random().toString(36).substr(2, 9),
          userId: myUserId,
          userName: userName,
          avatarColor: userAvatar,
          action: "left the server",
          timestamp: new Date().toISOString()
        };
        boardState.logs.unshift(leaveLog);
        if (boardState.logs.length > 50) boardState.logs.pop();
        saveDatabase(boardState);

        // Update cache
        await cacheService.setActiveUsers(boardId, activeUsers);

        broadcast({
          type: 'user:leave',
          payload: { id: myUserId }
        });

        broadcast({
          type: 'users:sync',
          payload: activeUsers
        });
      }
      console.log('Client disconnected. Remaining:', wss.clients.size);
    });

    ws.on('error', (err) => {
      console.error('Socket error handle:', err);
    });
  });

  setInterval(() => {
    const now = Date.now();
    let cleaned = false;
    for (const userId in userCursors) {
      if (now - userCursors[userId].lastActive > 8000) {
        delete userCursors[userId];
        cleaned = true;
      }
    }
    if (cleaned) {
      broadcast({
        type: 'cursor:sync',
        payload: userCursors
      });
    }
  }, 4000);

  // Security headers for all responses
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.get('*', (req, res) => {
    res.json({ 
      status: 'backend-running', 
      message: 'Multiplayer Task Board Backend API',
      endpoints: {
        health: '/api/health',
        auth: '/api/auth',
        boards: '/api/boards'
      }
    });
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully started on http://localhost:${PORT}`);
    console.log(`Redis cache: ${getRedisUrl()}`);
    console.log(`Node environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer();