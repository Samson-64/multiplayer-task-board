import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

function getCorsOrigins(): string[] {
  const origins = process.env.CORS_ORIGINS || 'http://localhost:5173';
  return origins.split(',').map(o => o.trim());
}

function validateNoWildcards(origins: string[]): boolean {
  return !origins.some(o => o.includes('*'));
}

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    const allowedOrigins = getCorsOrigins();
    
    if (process.env.NODE_ENV !== 'production' && !origin) {
      return callback(null, true);
    }
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Session-Id', 'Authorization']
});

export const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  skip: (req) => req.path === '/api/health'
});

export const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX_REQUESTS || '10', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' }
});

export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", ...getCorsOrigins()],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny'
  },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true
});

export function validateCorsConfig(): void {
  const origins = getCorsOrigins();
  
  if (!validateNoWildcards(origins)) {
    throw new Error('Wildcard (*) is not allowed in CORS_ORIGINS for security reasons');
  }
  
  console.log(`CORS configured for origins: ${origins.join(', ')}`);
}