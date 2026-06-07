import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../lib/jwt.js';
import type { UserRoleJwt } from '../lib/jwt.js';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const h = req.headers.authorization;
    if (!h?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token manquant' });
    }
    req.user = verifyToken(h.slice(7));
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

export function requireOrg(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.organizationId) {
    return res.status(403).json({ error: 'Réservé aux comptes rattachés à une organisation' });
  }
  next();
}

export function requireRoles(...roles: UserRoleJwt[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permission refusée' });
    }
    next();
  };
}
