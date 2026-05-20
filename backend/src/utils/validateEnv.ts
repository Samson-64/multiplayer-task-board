const REQUIRED_ENV_VARS: string[] = [];
const MIN_SESSION_SECRET_LENGTH = 32;

interface ValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

export function validateEnvironment(): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    warnings: [],
    errors: []
  };

  if (!process.env.SESSION_SECRET) {
    result.warnings.push('SESSION_SECRET is not set. Using default (NOT recommended for production).');
    process.env.SESSION_SECRET = 'dev-default-secret-do-not-use-in-production-min32chars';
  } else if (process.env.SESSION_SECRET.length < MIN_SESSION_SECRET_LENGTH) {
    result.warnings.push(
      `SESSION_SECRET must be at least ${MIN_SESSION_SECRET_LENGTH} characters. ` +
      `Current length: ${process.env.SESSION_SECRET.length}. This is insecure.`
    );
  }

  if (process.env.NODE_ENV === 'production') {
    if (!process.env.REDIS_URL) {
      result.errors.push('REDIS_URL is required in production');
      result.valid = false;
    }
  }

  const corsOrigins = (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
  if (corsOrigins.some(o => o.includes('*'))) {
    result.errors.push('Wildcard (*) is not allowed in CORS_ORIGINS for security reasons');
    result.valid = false;
  }

  if (result.warnings.length > 0) {
    console.warn('\n⚠️  Environment Warnings:');
    result.warnings.forEach(w => console.warn(`  - ${w}`));
  }

  if (result.errors.length > 0) {
    console.error('\n❌ Environment Errors:');
    result.errors.forEach(e => console.error(`  - ${e}`));
    if (process.env.NODE_ENV === 'production') {
      console.error('\n🔴 Production mode requires all environment variables to be properly configured.');
    }
  }

  console.log('\n✅ Environment validation complete.');
  return result;
}

export function getSessionSecret(): string {
  return process.env.SESSION_SECRET || 'fallback-not-set';
}

export function getRedisUrl(): string {
  return process.env.REDIS_URL || 'redis://localhost:6379';
}

export function getCorsOrigins(): string[] {
  return (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map(o => o.trim());
}

export function getRateLimitConfig(): { windowMs: number; max: number } {
  return {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
  };
}