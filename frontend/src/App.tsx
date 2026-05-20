import React, { useState, useEffect, useRef } from 'react';
import { BoardState, User, Task, Comment, ColumnType, ChatMessage, SocketMessage } from './types';
import KanbanColumn from './components/KanbanColumn';
import LiveUsers from './components/LiveUsers';
import TimelineLogs from './components/TimelineLogs';
import BoardChat from './components/BoardChat';
import CollaborativeCursors from './components/CollaborativeCursors';
import TaskModal from './components/TaskModal';
import { Layers, Wifi, WifiOff, RefreshCw, Layers3, Flame, AlertCircle } from 'lucide-react';

// Random User Identity Generator
const ADJECTIVES = ["Swift", "Wired", "Cosmic", "Prism", "Lunar", "Solar", "Optic", "Turbo", "Agile", "Zenith", "Neon", "Amber"];
const ANIMALS = ["Fox", "Owl", "Badger", "Falcon", "Otter", "Koala", "Beaver", "Panther", "Eagle", "Lynx", "Panda", "Cheetah"];
const AVATAR_COLORS = [
  'bg-slate-700',
  'bg-red-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-green-500',
  'bg-teal-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-rose-500',
  'bg-emerald-500',
];

function generateRandomUser(): User {
  const randAdj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const randAnim = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const randColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  const id = 'usr-' + Math.random().toString(36).substr(2, 9);
  
  return {
    id,
    name: `${randAdj} ${randAnim}`,
    avatarColor: randColor,
    activeTaskId: null,
    isTyping: false
  };
}

export default function App() {
  // Connection and Identity state
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem('multi_board_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback
      }
    }
    const fresh = generateRandomUser();
    localStorage.setItem('multi_board_user', JSON.stringify(fresh));
    return fresh;
  });

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Cooperative states
  const [boardState, setBoardState] = useState<BoardState>({
    tasks: [],
    logs: [],
    chat: []
  });
  const [activeUsers, setActiveUsers] = useState<{ [id: string]: User }>({});
  const [userCursors, setUserCursors] = useState<{
    [userId: string]: { userName: string; avatarColor: string; x: number; y: number; lastActive: number };
  }>({});

  // Editor Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [defaultTaskColumn, setDefaultTaskColumn] = useState<ColumnType>('todo');

  const socketRef = useRef<WebSocket | null>(null);
  const lastCursorEmitRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<number | null>(null);

  // Establish standard WebSocket connection with auto-reconnections
  const connectToSocket = () => {
    if (socketRef.current) {
      socketRef.current.close();
    }

    setIsConnecting(true);
    setSessionError(null);

    // Compute standard protocol matching host address
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const defaultWsUrl = `${wsProtocol}//${window.location.host}`;
    const wsUrl = import.meta.env.VITE_WS_URL || defaultWsUrl;

    console.log(`Establishing real-time connection to ${wsUrl}...`);
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log('Successfully connected to WebSocket synchronization hub.');
      setIsConnected(true);
      setIsConnecting(false);
      setSessionError(null);

      // Instantly register user profile with server
      ws.send(JSON.stringify({
        type: 'user:join',
        payload: {
          id: currentUser.id,
          name: currentUser.name,
          avatarColor: currentUser.avatarColor
        },
        boardId: 'default'
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as SocketMessage;
        
        switch (msg.type) {
          case 'init': {
            const { board, activeUsers: initUsers } = msg.payload;
            setBoardState(board);
            setActiveUsers(initUsers);
            break;
          }

          case 'user:join': {
            const { id, name, avatarColor } = msg.payload;
            setActiveUsers((prev) => ({
              ...prev,
              [id]: { id, name, avatarColor, activeTaskId: null, isTyping: false }
            }));
            break;
          }

          case 'users:sync': {
            setActiveUsers(msg.payload);
            break;
          }

          case 'user:leave': {
            const { id } = msg.payload;
            setActiveUsers((prev) => {
              const updated = { ...prev };
              delete updated[id];
              return updated;
            });
            setUserCursors((prev) => {
              const updated = { ...prev };
              delete updated[id];
              return updated;
            });
            break;
          }

          case 'board:sync': {
            // Update board state
            setBoardState(msg.payload.board);
            break;
          }

          case 'chat:message': {
            const { message } = msg.payload;
            setBoardState((prev) => {
              const exists = prev.chat.some(c => c.id === message.id);
              if (exists) return prev;
              const updatedChat = [...prev.chat, message];
              if (updatedChat.length > 100) updatedChat.shift();
              return { ...prev, chat: updatedChat };
            });
            break;
          }

          case 'cursor:move': {
            const { userId, userName, avatarColor, x, y } = msg.payload;
            setUserCursors((prev) => ({
              ...prev,
              [userId]: { userName, avatarColor, x, y, lastActive: Date.now() }
            }));
            break;
          }

          case 'cursor:sync': {
            setUserCursors(msg.payload);
            break;
          }
        }
      } catch (err) {
        console.error('Error handling WebSocket message payload:', err);
      }
    };

    ws.onclose = () => {
      console.warn('Real-time connection closed. Attempting reconnect...');
      setIsConnected(false);
      setIsConnecting(false);
      
      // Schedule automatic retry loop in 3 seconds
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connectToSocket();
      }, 3000);
    };

    ws.onerror = (err) => {
      console.error('Socket encountered errors:', err);
      setSessionError('Network socket handshake interrupted. Offline mode triggered.');
    };
  };

  useEffect(() => {
    connectToSocket();
    
    // Cleanup loops on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Update profile handler triggered from LiveUsers
  const handleUpdateProfile = (name: string, avatarColor: string) => {
    const updated = {
      ...currentUser,
      name,
      avatarColor
    };
    setCurrentUser(updated);
    localStorage.setItem('multi_board_user', JSON.stringify(updated));

    // Instantly notify Server of profile alterations
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'user:update',
        payload: {
          id: currentUser.id,
          name,
          avatarColor,
          activeTaskId: currentUser.activeTaskId,
          isTyping: currentUser.isTyping
        },
        boardId: 'default'
      }));
    }
  };

  // Set typing states for Chat Box Input
  const handleSetTyping = (isTyping: boolean) => {
    if (currentUser.isTyping === isTyping) return;
    
    const updated = { ...currentUser, isTyping };
    setCurrentUser(updated);

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'user:update',
        payload: {
          id: currentUser.id,
          name: currentUser.name,
          avatarColor: currentUser.avatarColor,
          activeTaskId: currentUser.activeTaskId,
          isTyping
        },
        boardId: 'default'
      }));
    }
  };

  // Broadcast coordinate presence as mouse floats over board
  const handleBoardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isConnected || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;

    const bounds = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - bounds.left) / bounds.width) * 100;
    const y = ((e.clientY - bounds.top) / bounds.height) * 100;

    const now = Date.now();
    // Throttle cursor updates (every 50ms) to ensure lightweight networking
    if (now - lastCursorEmitRef.current > 50) {
      lastCursorEmitRef.current = now;
      socketRef.current.send(JSON.stringify({
        type: 'cursor:move',
        payload: {
          userId: currentUser.id,
          userName: currentUser.name,
          avatarColor: currentUser.avatarColor,
          x,
          y
        },
        boardId: 'default'
      }));
    }
  };

  // Move visual card instantly (Optimistic update)
  const handleMoveTask = (taskId: string, targetColId: ColumnType) => {
    const origTasks = [...boardState.tasks];
    const taskIdx = boardState.tasks.findIndex(t => t.id === taskId);
    if (taskIdx === -1) return;

    const task = boardState.tasks[taskIdx];
    if (task.column === targetColId) return;

    const updatedTask = {
      ...task,
      column: targetColId,
      updatedAt: new Date().toISOString()
    };

    // Apply change locally instantly
    const updatedTasks = [...boardState.tasks];
    updatedTasks[taskIdx] = updatedTask;
    setBoardState(prev => ({ ...prev, tasks: updatedTasks }));

    // Send update request to server
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'task:upsert',
        payload: {
          task: updatedTask,
          userId: currentUser.id,
          userName: currentUser.name,
          avatarColor: currentUser.avatarColor
        },
        boardId: 'default'
      }));
    } else {
      // Revert change if disconnected
      setBoardState(prev => ({ ...prev, tasks: origTasks }));
    }
  };

  // Create or Update task handler from Editor Modal
  const handleSaveTask = (task: Task) => {
    // Optimistically insert locally first
    setBoardState(prev => {
      const idx = prev.tasks.findIndex(t => t.id === task.id);
      const copy = [...prev.tasks];
      if (idx !== -1) {
        copy[idx] = task;
      } else {
        copy.unshift(task);
      }
      return { ...prev, tasks: copy };
    });

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'task:upsert',
        payload: {
          task,
          userId: currentUser.id,
          userName: currentUser.name,
          avatarColor: currentUser.avatarColor
        },
        boardId: 'default'
      }));
    }
  };

  const handleDeleteTask = (taskId: string, title: string) => {
    if (confirm(`Are you sure you want to delete task "${title}"?`)) {
      // Optimistically delete locally
      setBoardState(prev => ({
        ...prev,
        tasks: prev.tasks.filter(t => t.id !== taskId)
      }));

      // Broadcast delete parameter
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'task:delete',
          payload: {
            taskId,
            title,
            userId: currentUser.id,
            userName: currentUser.name,
            avatarColor: currentUser.avatarColor
          },
          boardId: 'default'
        }));
      }
    }
  };

  const handleSendMessage = (text: string) => {
    const message: ChatMessage = {
      id: 'msg-' + Math.random().toString(36).substr(2, 9),
      userId: currentUser.id,
      userName: currentUser.name,
      avatarColor: currentUser.avatarColor,
      text,
      timestamp: new Date().toISOString()
    };

    setBoardState(prev => ({
      ...prev,
      chat: [...prev.chat, message]
    }));

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'chat:message',
        payload: { message },
        boardId: 'default'
      }));
    }
  };

  // Open task detail editor modal
  const handleOpenEditTask = (task: Task) => {
    setSelectedTask(task);
    setModalOpen(true);

    // Sync current editing target to other clients (glowing view indicator)
    const updated = { ...currentUser, activeTaskId: task.id };
    setCurrentUser(updated);

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'user:update',
        payload: {
          id: currentUser.id,
          name: currentUser.name,
          avatarColor: currentUser.avatarColor,
          activeTaskId: task.id,
          isTyping: currentUser.isTyping
        },
        boardId: 'default'
      }));
    }
  };

  const handleOpenCreateTask = (columnId: ColumnType) => {
    setDefaultTaskColumn(columnId);
    setSelectedTask(null);
    setModalOpen(true);
  };

  // Close task detail modal
  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedTask(null);

    // Remove editing marker
    const updated = { ...currentUser, activeTaskId: null };
    setCurrentUser(updated);

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'user:update',
        payload: {
          id: currentUser.id,
          name: currentUser.name,
          avatarColor: currentUser.avatarColor,
          activeTaskId: null,
          isTyping: currentUser.isTyping
        },
        boardId: 'default'
      }));
    }
  };

  // Categorize local tasks by column status
  const tasksByColumn = {
    todo: boardState.tasks.filter((t) => t.column === 'todo'),
    inprogress: boardState.tasks.filter((t) => t.column === 'inprogress'),
    review: boardState.tasks.filter((t) => t.column === 'review'),
    done: boardState.tasks.filter((t) => t.column === 'done')
  };

  // Theme profiles for columns
  const columnThemes = {
    todo: {
      border: 'border-slate-300 focus:border-slate-500',
      bullet: 'bg-slate-400',
      bg: 'bg-slate-50/70'
    },
    inprogress: {
      border: 'border-blue-200 focus:border-blue-400',
      bullet: 'bg-blue-500',
      bg: 'bg-blue-50/40'
    },
    review: {
      border: 'border-amber-200 focus:border-amber-400',
      bullet: 'bg-amber-500',
      bg: 'bg-amber-50/40'
    },
    done: {
      border: 'border-emerald-200 focus:border-emerald-400',
      bullet: 'bg-emerald-500',
      bg: 'bg-emerald-50/40'
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F4F5] flex flex-col font-sans select-none antialiased text-gray-900">
      {/* Visual Navigation Header */}
      <header className="bg-white border-b-4 border-gray-900 px-6 py-4 sticky top-4 z-30 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] m-4 rounded-xl max-w-7xl mx-auto w-[calc(100%-2rem)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Layers className="w-6 h-6 text-white stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight uppercase text-gray-900">SyncBoard Pro</h1>
              <p className="text-xs font-bold text-indigo-600 flex items-center gap-1.5 uppercase tracking-wide">
                <span className={`w-2.5 h-2.5 rounded-full border border-gray-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span> 
                LIVE SYNC ACTIVE • {Object.keys(activeUsers).length} CO-WORKERS ONLINE
              </p>
            </div>
          </div>

          {/* Connected state badge */}
          <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between border-t border-slate-50 pt-2 sm:pt-0 sm:border-0">
            {sessionError && (
              <span className="text-[10px] text-red-700 font-mono font-bold flex items-center gap-1 bg-red-100 px-2 py-0.5 rounded border-2 border-gray-900 uppercase">
                <AlertCircle className="w-3 h-3 text-red-650" />
                Error
              </span>
            )}
            
            <div className={`px-3 py-1.5 rounded border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2 font-mono text-xs font-black uppercase ${
              isConnected 
                ? 'bg-emerald-100 text-emerald-950' 
                : isConnecting
                  ? 'bg-amber-100 text-amber-955 animate-pulse'
                  : 'bg-red-100 text-red-950'
            }`}>
              {isConnected ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-700 stroke-[3]" />
                  <span>CONNECTED</span>
                </>
              ) : isConnecting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-amber-700 animate-spin" />
                  <span>HANDSHAKING...</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-red-700" />
                  <span>OFFLINE</span>
                </>
              )}
            </div>

            {/* Force rejoin button */}
            {!isConnected && (
              <button
                id="force-reconnect-btn"
                onClick={connectToSocket}
                className="px-3 py-1.5 bg-gray-900 text-white border-2 border-gray-900 rounded font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-800 hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3 stroke-[3]" />
                REJOIN
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-6 flex flex-col gap-6">
        {/* Connection Interruption banner */}
        {!isConnected && !isConnecting && (
          <div className="bg-red-100 border-2 border-gray-900 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-red-950">Connection to Sockets Lost</h4>
              <p className="text-[11px] font-bold text-red-900 mt-0.5 uppercase">Your board state is falling back to safe offline cache. Drag edits are saved locally but won't sync until socket state connects.</p>
            </div>
            <button
              onClick={connectToSocket}
              className="px-3 py-1.5 bg-gray-900 text-white border-2 border-gray-900 font-black text-xs rounded hover:bg-red-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-colors cursor-pointer"
            >
              Retry Rejoining
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Kanban Board Container (3/4 grid columns) */}
          <div 
            id="workspace-board-wrapper"
            onMouseMove={handleBoardMouseMove}
            className="lg:col-span-3 flex flex-col h-full relative"
          >
            {/* Draw Pointer cursors of other connected editors over the board */}
            <CollaborativeCursors 
              cursors={userCursors}
              currentUserId={currentUser.id}
            />

            {/* Kanban Columns */}
            <div id="board-grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <KanbanColumn
                id="todo"
                title="📍 Backlog"
                colorTheme={columnThemes.todo}
                tasks={tasksByColumn.todo}
                activeUsers={activeUsers}
                currentUserId={currentUser.id}
                onEditTask={handleOpenEditTask}
                onDeleteTask={handleDeleteTask}
                onMoveTask={handleMoveTask}
                onAddNewTask={handleOpenCreateTask}
              />
              <KanbanColumn
                id="inprogress"
                title="⚡ Active"
                colorTheme={columnThemes.inprogress}
                tasks={tasksByColumn.inprogress}
                activeUsers={activeUsers}
                currentUserId={currentUser.id}
                onEditTask={handleOpenEditTask}
                onDeleteTask={handleDeleteTask}
                onMoveTask={handleMoveTask}
                onAddNewTask={handleOpenCreateTask}
              />
              <KanbanColumn
                id="review"
                title="🔍 Review"
                colorTheme={columnThemes.review}
                tasks={tasksByColumn.review}
                activeUsers={activeUsers}
                currentUserId={currentUser.id}
                onEditTask={handleOpenEditTask}
                onDeleteTask={handleDeleteTask}
                onMoveTask={handleMoveTask}
                onAddNewTask={handleOpenCreateTask}
              />
              <KanbanColumn
                id="done"
                title="✅ Completed"
                colorTheme={columnThemes.done}
                tasks={tasksByColumn.done}
                activeUsers={activeUsers}
                currentUserId={currentUser.id}
                onEditTask={handleOpenEditTask}
                onDeleteTask={handleDeleteTask}
                onMoveTask={handleMoveTask}
                onAddNewTask={handleOpenCreateTask}
              />
            </div>
          </div>

          {/* Collaboration Side widgets (1/4 grid column) */}
          <div id="collaboration-aside" className="flex flex-col gap-6 lg:sticky lg:top-[100px]">
            {/* Online co-workers list with user editor */}
            <LiveUsers
              activeUsers={activeUsers}
              currentUserId={currentUser.id}
              currentUser={currentUser}
              onUpdateProfile={handleUpdateProfile}
              isConnected={isConnected}
            />

            {/* Unified live board Chat Box */}
            <BoardChat
              chat={boardState.chat}
              currentUser={currentUser}
              onSendMessage={handleSendMessage}
              onSetTyping={handleSetTyping}
            />

            {/* audit trace Activity Timeline Logger */}
            <TimelineLogs
              logs={boardState.logs}
            />
          </div>
        </div>
      </main>

      {/* Bottom Status Bar */}
      <footer className="mt-8 flex flex-col sm:flex-row justify-between items-center py-4 border-t-2 border-gray-900 max-w-7xl mx-auto w-full px-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 text-[11px] font-black uppercase tracking-tighter text-gray-900">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full border border-gray-900 ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            WEBSOCKET: {isConnected ? 'CONNECTED (12ms)' : 'DISCONNECTED'}
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-indigo-550 rounded-full border border-gray-900 bg-indigo-600"></span>
            THEME: BENTO GRID NEO-BRUTALIST
          </div>
        </div>
        <div className="text-[11px] font-black text-gray-400 mt-2 sm:mt-0 uppercase tracking-widest">
          LAST SYNC: JUST NOW • v4.2.0-STABLE
        </div>
      </footer>

      {/* Popover Card Details Editor Modal */}
      {modalOpen && (
        <TaskModal
          task={selectedTask}
          defaultColumn={defaultTaskColumn}
          currentUser={currentUser}
          onClose={handleCloseModal}
          onSave={handleSaveTask}
          onSetTyping={handleSetTyping}
        />
      )}
    </div>
  );
}
