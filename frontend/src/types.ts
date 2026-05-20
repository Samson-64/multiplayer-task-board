export type ColumnType = 'todo' | 'inprogress' | 'review' | 'done';

export interface Comment {
  id: string;
  userName: string;
  avatarColor: string;
  text: string;
  createdAt: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  column: ColumnType;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  assignee?: string;
  assigneeColor?: string;
  comments: Comment[];
  checklist: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  avatarColor: string;
  activeTaskId: string | null;
  isTyping: boolean;
  color?: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  avatarColor: string;
  action: string;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  avatarColor: string;
  text: string;
  timestamp: string;
}

export interface BoardState {
  tasks: Task[];
  logs: ActivityLog[];
  chat: ChatMessage[];
}

// WebSocket Event types - with boardId support
export type SocketMessage =
  | { type: 'init'; payload: { board: BoardState; activeUsers: { [id: string]: User }; boardId: string } }
  | { type: 'user:join'; payload: { id: string; name: string; avatarColor: string }; boardId?: string }
  | { type: 'user:update'; payload: { id: string; name: string; avatarColor: string; activeTaskId: string | null; isTyping: boolean }; boardId?: string }
  | { type: 'user:leave'; payload: { id: string }; boardId?: string }
  | { type: 'users:sync'; payload: { [id: string]: User } }
  | { type: 'board:sync'; payload: { board: BoardState; actionBy?: string; boardId?: string } }
  | { type: 'task:upsert'; payload: { task: Task; userId: string; userName: string; avatarColor: string }; boardId?: string }
  | { type: 'task:delete'; payload: { taskId: string; title: string; userId: string; userName: string; avatarColor: string }; boardId?: string }
  | { type: 'chat:message'; payload: { message: ChatMessage }; boardId?: string }
  | { type: 'cursor:move'; payload: { userId: string; userName: string; avatarColor: string; x: number; y: number }; boardId?: string }
  | { type: 'cursor:sync'; payload: { [userId: string]: { userName: string; avatarColor: string; x: number; y: number; lastActive: number } } };

// Default board ID
export const DEFAULT_BOARD_ID = 'default';