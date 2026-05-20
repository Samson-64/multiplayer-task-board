import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import { BoardState, User, SocketMessage, Task, ChatMessage } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
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

let boardState: BoardState = { ...DEFAULT_BOARD_STATE };

function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const loaded = JSON.parse(content);
      if (loaded && Array.isArray(loaded.tasks) && Array.isArray(loaded.logs) && Array.isArray(loaded.chat)) {
        boardState = loaded;
        console.log("Database loaded successfully from " + DB_FILE);
      } else {
        console.log("Database file is invalid, using default state.");
        boardState = { ...DEFAULT_BOARD_STATE };
      }
    } else {
      saveDatabase();
    }
  } catch (error) {
    console.error("Failed to load DB file:", error);
    boardState = { ...DEFAULT_BOARD_STATE };
  }
}

function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(boardState, null, 2), 'utf-8');
  } catch (err) {
    console.error("Failed to save DB file:", err);
  }
}

loadDatabase();

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', clients: wss.clients.size });
  });

  const activeUsers: { [id: string]: User } = {};
  const activeSockets = new Map<WebSocket, string>();

  const userCursors: { [userId: string]: { userName: string; avatarColor: string; x: number; y: number; lastActive: number } } = {};

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  const broadcast = (message: SocketMessage, excludeSocket?: WebSocket) => {
    const payload = JSON.stringify(message);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && client !== excludeSocket) {
        client.send(payload);
      }
    });
  };

  wss.on('connection', (ws) => {
    console.log('Client connected. Total clients:', wss.clients.size);
    let myUserId: string | null = null;

    ws.on('message', (rawData) => {
      try {
        const msg = JSON.parse(rawData.toString()) as SocketMessage;

        switch (msg.type) {
          case 'user:join': {
            const { id, name, avatarColor } = msg.payload;
            myUserId = id;
            activeSockets.set(ws, id);

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
            saveDatabase();

            ws.send(JSON.stringify({
              type: 'init',
              payload: {
                board: boardState,
                activeUsers
              }
            }));

            broadcast({
              type: 'user:join',
              payload: { id, name, avatarColor }
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

            saveDatabase();

            broadcast({
              type: 'board:sync',
              payload: {
                board: boardState,
                actionBy: userId
              }
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
              saveDatabase();

              broadcast({
                type: 'board:sync',
                payload: {
                  board: boardState,
                  actionBy: userId
                }
              });
            }
            break;
          }

          case 'chat:message': {
            const { message } = msg.payload;
            boardState.chat.push(message);
            if (boardState.chat.length > 100) boardState.chat.shift();
            saveDatabase();

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

    ws.on('close', () => {
      if (myUserId) {
        const userName = activeUsers[myUserId]?.name || 'Unknown User';
        const userAvatar = activeUsers[myUserId]?.avatarColor || 'bg-gray-500';

        delete activeUsers[myUserId];
        delete userCursors[myUserId];
        activeSockets.delete(ws);

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
        saveDatabase();

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

  app.get('*', (req, res) => {
    res.json({ status: 'backend-running', message: 'Multiplayer Task Board Backend API' });
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully started on http://localhost:${PORT} with NODE_ENV=${process.env.NODE_ENV || 'development'}`);
  });
}

startServer();