import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './routes/auth.routes.js';
import organizationsRoutes from './routes/organizations.routes.js';
import clientsRoutes from './routes/clients.routes.js';
import productsRoutes from './routes/products.routes.js';
import invoicesRoutes from './routes/invoices.routes.js';
import quotesRoutes from './routes/quotes.routes.js';
import superadminRoutes from './routes/superadmin.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import paymentsRoutes from './routes/payments.routes.js';
import recurringRoutes from './routes/recurring.routes.js';
import stockRoutes from './routes/stock.routes.js';
import categoriesRoutes from './routes/categories.routes.js';
import signatureRoutes from './routes/signature.routes.js';
import billingProtectedRoutes, { billingPublicRouter } from './routes/billing.routes.js';
import billingWebhooksRoutes from './routes/billing.webhooks.routes.js';
import receivedInvoicesRoutes from './routes/receivedInvoices.routes.js';
import paWebhooksRoutes from './routes/pa.webhooks.routes.js';
import { authMiddleware, requireOrg, requireRoles } from './middleware/auth.js';
import { requireOnboardingComplete } from './middleware/onboarding.js';
import { isEinvoiceFeaturesEnabled } from './lib/featureFlags.js';
import { openapiSpec } from './lib/openapi.js';
import { logger } from './lib/logger.js';
import { Prisma } from './generated/prisma/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../uploads');

export function createApp() {
  const app = express();
  // Derrière nginx en prod ; activé par défaut sauf TRUST_PROXY=0 explicite.
  if (process.env.TRUST_PROXY !== '0') {
    app.set('trust proxy', 1);
  }
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  const corsOrigins = (
    process.env.CORS_ORIGIN ??
    process.env.FRONTEND_URL ??
    'http://localhost:3000,http://localhost:3001,http://localhost:3002'
  )
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const isDev = process.env.NODE_ENV !== 'production';
  const localhostOrigin = /^https?:\/\/localhost(:\d+)?$/;
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          callback(null, true);
          return;
        }
        if (isDev && localhostOrigin.test(origin)) {
          callback(null, true);
          return;
        }
        if (corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error(`CORS: origin not allowed (${origin})`));
      },
      credentials: true,
    })
  );
  app.use(
    '/api/billing/webhooks',
    express.raw({ type: 'application/json' }),
    billingWebhooksRoutes
  );

  app.use('/api/uploads', express.static(uploadsDir));

  app.use(express.json({ limit: '2mb' }));
  if (isEinvoiceFeaturesEnabled()) {
    app.use('/api/webhooks/pa', paWebhooksRoutes);
  }

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Trop de requêtes, veuillez réessayer plus tard.',
    standardHeaders: true,
    legacyHeaders: false,
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 login attempts per windowMs (dev mode)
    message: 'Trop de tentatives de connexion, veuillez réessayer plus tard.',
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(limiter);

  const healthHandler = (_req: express.Request, res: express.Response) => {
    res.json({ ok: true, service: 'softfacture-api' });
  };

  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);

  // API Documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

  app.use('/api/auth', authLimiter, authRoutes);

  app.use('/api/organizations', authMiddleware, requireOrg, organizationsRoutes);
  app.use('/api/clients', authMiddleware, requireOrg, requireOnboardingComplete, clientsRoutes);
  app.use('/api/products', authMiddleware, requireOrg, requireOnboardingComplete, productsRoutes);
  app.use('/api/invoices', authMiddleware, requireOrg, requireOnboardingComplete, invoicesRoutes);
  if (isEinvoiceFeaturesEnabled()) {
    app.use(
      '/api/received-invoices',
      authMiddleware,
      requireOrg,
      requireOnboardingComplete,
      receivedInvoicesRoutes
    );
  }
  app.use('/api/quotes', authMiddleware, requireOrg, requireOnboardingComplete, quotesRoutes);
  app.use('/api/payments', authMiddleware, requireOrg, requireOnboardingComplete, paymentsRoutes);
  app.use(
    '/api/recurring-invoices',
    authMiddleware,
    requireOrg,
    requireOnboardingComplete,
    recurringRoutes
  );
  app.use('/api/stock', authMiddleware, requireOrg, requireOnboardingComplete, stockRoutes);
  app.use(
    '/api/categories',
    authMiddleware,
    requireOrg,
    requireOnboardingComplete,
    categoriesRoutes
  );
  app.use(
    '/api/signatures',
    authMiddleware,
    requireOrg,
    requireOnboardingComplete,
    signatureRoutes
  );
  app.use('/api/dashboard', authMiddleware, requireOrg, requireOnboardingComplete, dashboardRoutes);
  app.use('/api/billing', billingPublicRouter);
  app.use(
    '/api/billing',
    authMiddleware,
    requireOrg,
    requireOnboardingComplete,
    billingProtectedRoutes
  );

  app.use('/api/superadmin', authMiddleware, requireRoles('SUPERADMIN'), superadminRoutes);

  app.use(
    (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      void _next;
      logger.error({ err }, 'Server error');

      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
          return res.status(409).json({ error: 'Email déjà utilisé' });
        }
        if (err.code === 'P2022') {
          return res.status(500).json({
            error: 'Base de données non à jour — exécutez npm run db:migrate dans backend/.',
          });
        }
      }

      if (err instanceof Prisma.PrismaClientValidationError) {
        return res.status(500).json({ error: 'Erreur serveur (schéma base de données)' });
      }

      res.status(500).json({ error: 'Erreur serveur' });
    }
  );

  return app;
}
