import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient } from '../generated/prisma/index.js';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: pg.Pool | undefined;
};

export function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL requis');
  const pool = globalForPrisma.pool ?? new pg.Pool({ connectionString: url });
  if (process.env.NODE_ENV !== 'production') globalForPrisma.pool = pool;
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
  return prisma;
}

export const prisma = getPrisma();
