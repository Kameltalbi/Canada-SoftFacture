import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('4000'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  CORS_ORIGIN: z.string().optional(),
  FRONTEND_URL: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

function parseEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (err) {
    console.error('\n✗ Configuration backend/.env invalide ou incomplète.');
    console.error('  Requis : DATABASE_URL, JWT_SECRET (min 16 car.), PORT (4001 en prod)\n');
    if (err instanceof z.ZodError) {
      for (const issue of err.issues) {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
      }
    } else {
      console.error(err);
    }
    process.exit(1);
  }
}

export const env = parseEnv();
