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

export type SocketMessage =
  | { type: 'init'; payload: { board: BoardState; activeUsers: { [id: string]: User } } }
  | { type: 'user:join'; payload: { id: string; name: string; avatarColor: string } }
  | { type: 'user:update'; payload: { id: string; name: string; avatarColor: string; activeTaskId: string | null; isTyping: boolean } }
  | { type: 'user:leave'; payload: { id: string } }
  | { type: 'users:sync'; payload: { [id: string]: User } }
  | { type: 'board:sync'; payload: { board: BoardState; actionBy?: string } }
  | { type: 'task:upsert'; payload: { task: Task; userId: string; userName: string; avatarColor: string } }
  | { type: 'task:delete'; payload: { taskId: string; title: string; userId: string; userName: string; avatarColor: string } }
  | { type: 'chat:message'; payload: { message: ChatMessage } }
  | { type: 'cursor:move'; payload: { userId: string; userName: string; avatarColor: string; x: number; y: number } }
  | { type: 'cursor:sync'; payload: { [userId: string]: { userName: string; avatarColor: string; x: number; y: number; lastActive: number } } };