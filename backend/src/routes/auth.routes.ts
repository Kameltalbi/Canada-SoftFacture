import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { signToken } from '../lib/jwt.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { authMiddleware } from '../middleware/auth.js';
import { assertCanAddOrgSeat, SeatLimitError } from '../lib/planLimits.js';
import { generateResetToken, resetExpiresAt } from '../lib/resetToken.js';
import { getFrontendBaseUrl } from '../lib/billing/plans.js';
import { sendPasswordResetEmail } from '../services/email.js';
import { asyncRoute } from '../lib/asyncRoute.js';
import { logoUrlForApi } from '../lib/orgLogoApi.js';

const router = Router();

const CURRENT_TERMS_VERSION = 'v1.0-2026-06';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  organizationName: z.string().min(2).max(200),
  phone: z.string().min(8).max(24),
  acceptTerms: z.literal(true, {
    message: 'Vous devez accepter les CGU et la Politique de confidentialité.',
  }),
});

router.post(
  '/register',
  asyncRoute(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Données invalides', details: parsed.error.flatten() });
    }
    const { email, password, firstName, lastName, organizationName, phone } = parsed.data;
    const name = `${firstName.trim()} ${lastName.trim()}`;
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();

    const exists = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (exists) return res.status(409).json({ error: 'Email déjà utilisé' });

    const passwordHash = await hashPassword(password);

    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: organizationName.trim(),
          billingLegalName: organizationName.trim(),
          billingEmail: normalizedEmail,
          country: 'CA',
          defaultCurrency: 'CAD',
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const user = await (tx as any).user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          name,
          phone: normalizedPhone,
          role: 'ADMIN',
          organizationId: org.id,
          termsAcceptedAt: new Date(),
          termsVersion: CURRENT_TERMS_VERSION,
        },
      });
      return { org, user };
    });

    const token = signToken({
      sub: result.user.id,
      email: result.user.email,
      role: 'ADMIN',
      organizationId: result.org.id,
    });

    return res.status(201).json({
      token,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        phone: result.user.phone,
        role: result.user.role,
        organizationId: result.org.id,
      },
    });
  })
);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post(
  '/login',
  asyncRoute(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Données invalides' });
    }
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }
    if (!user.isActive) return res.status(403).json({ error: 'Compte désactivé' });

    const token = signToken({
      sub: user.id,
      email: user.email,
      role: user.role as 'SUPERADMIN' | 'ADMIN' | 'USER',
      organizationId: user.organizationId,
    });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
      },
    });
  })
);

router.get('/invite', async (req, res) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!token) return res.status(400).json({ error: 'Token manquant' });

  const invitation = await prisma.userInvitation.findUnique({
    where: { token },
    include: { organization: { select: { name: true } } },
  });
  if (!invitation || invitation.acceptedAt) {
    return res.status(404).json({ error: 'Invitation invalide ou déjà utilisée' });
  }
  if (invitation.expiresAt < new Date()) {
    return res.status(410).json({ error: 'Invitation expirée' });
  }

  return res.json({
    email: invitation.email,
    name: invitation.name,
    role: invitation.role,
    organizationName: invitation.organization.name,
    expiresAt: invitation.expiresAt,
  });
});

const acceptInviteSchema = z.object({
  token: z.string().min(16),
  password: z.string().min(8),
  name: z.string().min(1).max(120).optional(),
});

router.post('/accept-invite', async (req, res) => {
  const parsed = acceptInviteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Données invalides', details: parsed.error.flatten() });
  }

  const invitation = await prisma.userInvitation.findUnique({
    where: { token: parsed.data.token },
  });
  if (!invitation || invitation.acceptedAt) {
    return res.status(404).json({ error: 'Invitation invalide ou déjà utilisée' });
  }
  if (invitation.expiresAt < new Date()) {
    return res.status(410).json({ error: 'Invitation expirée' });
  }

  const email = invitation.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'Un compte existe déjà avec cet email' });
  }

  try {
    await assertCanAddOrgSeat(invitation.organizationId);
  } catch (e) {
    if (e instanceof SeatLimitError) {
      return res.status(403).json({
        error: "Cette organisation a atteint la limite d'utilisateurs de son offre.",
        code: e.code,
      });
    }
    throw e;
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const name = parsed.data.name?.trim() || invitation.name || email.split('@')[0];

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: invitation.role,
        organizationId: invitation.organizationId,
      },
    });
    await tx.userInvitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });
    return created;
  });

  const jwt = signToken({
    sub: user.id,
    email: user.email,
    role: user.role as 'ADMIN' | 'USER',
    organizationId: user.organizationId,
  });

  return res.status(201).json({
    token: jwt,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
    },
  });
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

router.post('/forgot-password', async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Email invalide' });
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  if (user?.isActive) {
    const token = generateResetToken();
    await prisma.$transaction(async (tx) => {
      await tx.passwordReset.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      await tx.passwordReset.create({
        data: {
          userId: user.id,
          token,
          expiresAt: resetExpiresAt(),
        },
      });
    });

    const resetUrl = `${getFrontendBaseUrl()}/reset-password?token=${token}`;
    const emailSent = await sendPasswordResetEmail({ to: email, resetUrl });

    return res.json({
      ok: true,
      message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
      resetUrl: emailSent ? undefined : resetUrl,
    });
  }

  return res.json({
    ok: true,
    message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
  });
});

router.get('/reset-password', async (req, res) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!token) return res.status(400).json({ error: 'Token manquant' });

  const reset = await prisma.passwordReset.findUnique({
    where: { token },
    include: { user: { select: { email: true, isActive: true } } },
  });
  if (!reset || reset.usedAt || !reset.user.isActive) {
    return res.status(404).json({ error: 'Lien invalide ou déjà utilisé' });
  }
  if (reset.expiresAt < new Date()) {
    return res.status(410).json({ error: 'Lien expiré' });
  }

  return res.json({ email: reset.user.email });
});

const resetPasswordSchema = z.object({
  token: z.string().min(16),
  password: z.string().min(8),
});

router.post('/reset-password', async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Données invalides', details: parsed.error.flatten() });
  }

  const reset = await prisma.passwordReset.findUnique({
    where: { token: parsed.data.token },
    include: { user: true },
  });
  if (!reset || reset.usedAt || !reset.user.isActive) {
    return res.status(404).json({ error: 'Lien invalide ou déjà utilisé' });
  }
  if (reset.expiresAt < new Date()) {
    return res.status(410).json({ error: 'Lien expiré' });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: reset.userId },
      data: { passwordHash },
    });
    await tx.passwordReset.update({
      where: { id: reset.id },
      data: { usedAt: new Date() },
    });
    await tx.passwordReset.updateMany({
      where: { userId: reset.userId, usedAt: null },
      data: { usedAt: new Date() },
    });
  });

  return res.json({ ok: true, message: 'Mot de passe mis à jour' });
});

router.get(
  '/me',
  authMiddleware,
  asyncRoute(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      include: { organization: true },
    });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    const organization = user.organization
      ? { ...user.organization, logoUrl: logoUrlForApi(user.organization.logoUrl) }
      : null;

    return res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      organizationId: user.organizationId,
      organization,
    });
  })
);

export default router;
