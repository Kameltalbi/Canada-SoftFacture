import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/db.js';

export async function requireOnboardingComplete(req: Request, res: Response, next: NextFunction) {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return res.status(403).json({ error: 'Réservé aux comptes rattachés à une organisation' });
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { onboardingCompletedAt: true },
  });

  if (!org?.onboardingCompletedAt) {
    return res.status(403).json({
      error:
        'Configuration initiale requise — choisissez un plan et complétez les informations de votre société.',
      code: 'ONBOARDING_REQUIRED',
    });
  }

  next();
}
