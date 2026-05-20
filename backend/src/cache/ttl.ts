export const CACHE_TTL = {
  // Board state (short TTL - frequently updated)
  boardTasks: 60,           // 1 minute
  boardChat: 30,            // 30 seconds
  
  // Board metadata (moderate TTL)
  boardMeta: 300,           // 5 minutes
  boardLogs: 60,            // 1 minute
  
  // Expensive aggregations (longer TTL)
  boardSummary: 120,        // 2 minutes
  boardList: 300,          // 5 minutes
  
  // Sessions (long TTL)
  session: 86400,          // 24 hours
  userPermissions: 3600,    // 1 hour
  userWorkspace: 1800,      // 30 minutes
  refreshToken: 604800,    // 7 days
  
  // Auth
  authSession: 86400,       // 24 hours
  
  // API responses
  apiHealth: 30,            // 30 seconds
};