export const CACHE_KEYS = {
  // Board state (multiple boards supported)
  board: (boardId: string) => `board:${boardId}`,
  boardTasks: (boardId: string) => `board:${boardId}:tasks`,
  boardMeta: (boardId: string) => `board:${boardId}:meta`,
  boardLogs: (boardId: string) => `board:${boardId}:logs`,
  boardSummary: (boardId: string) => `board:${boardId}:summary`,
  boardChat: (boardId: string) => `board:${boardId}:chat`,
  boardList: () => 'boards:list',

  // User sessions
  session: (sessionId: string) => `session:${sessionId}`,
  userPermissions: (userId: string) => `user:${userId}:permissions`,
  userWorkspace: (userId: string) => `user:${userId}:workspace`,
  refreshToken: (token: string) => `refresh:${token}`,
  activeUsers: (boardId: string) => `users:${boardId}:active`,
  
  // Auth
  authSession: (sessionId: string) => `auth:${sessionId}`,
};