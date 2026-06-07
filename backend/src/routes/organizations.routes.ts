import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { PdfDocumentTemplate, Prisma } from '../generated/prisma/index.js';
import { prisma } from '../lib/db.js';
import { requireRoles } from '../middleware/auth.js';
import { streamOtherDocumentPdf } from '../services/pdfOtherDocument.js';
import {
  NUMBER_FORMAT_PRESETS,
  previewNextDocumentNumber,
  validateNumberFormat,
  type DocumentNumberType,
} from '../lib/documentNumbering.js';
import { normalizeHexColor, sanitizePdfSettingsPatch } from '../lib/pdfPlanConfig.js';
import { resolvePdfAccent } from '../lib/pdfTheme.js';
import { UserRole } from '../generated/prisma/index.js';
import { hashPassword } from '../lib/password.js';
import {
  assertCanAddOrgSeat,
  countOrganizationSeats,
  maxUsersForPlan,
  SeatLimitError,
} from '../lib/planLimits.js';
import { generateInviteToken, inviteExpiresAt } from '../lib/inviteToken.js';
import { getFrontendBaseUrl, slugToSubscriptionPlan, TRIAL_DAYS } from '../lib/billing/plans.js';
import { normalizeSiret, normalizeVatNumber, isValidEmail } from '../lib/billing/validation.js';
import { requireOnboardingComplete } from '../middleware/onboarding.js';
import { APP_BRAND } from '../lib/appBrand.js';
import { logger } from '../lib/logger.js';
import { sendUserInviteEmail } from '../services/email.js';
import { PRODUCT_KIND } from '../lib/productKind.js';
import { deleteOrgLogoFiles, logoExtension, saveOrgLogoFile } from '../lib/orgLogoStorage.js';

const router = Router();

const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 700 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (logoExtension(file.mimetype)) cb(null, true);
    else cb(new Error('UNSUPPORTED_LOGO_TYPE'));
  },
});

router.get('/', async (req, res) => {
  const orgId = req.user!.organizationId!;
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) return res.status(404).json({ error: 'Organisation introuvable' });
  return res.json(org);
});

/** Génère une suggestion de pied de page légal à partir des données structurées */
router.get('/legal-footer-suggestion', async (req, res) => {
  const orgId = req.user!.organizationId!;
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) return res.status(404).json({ error: 'Organisation introuvable' });

  const parts: string[] = [];

  if (org.legalForm || org.name) {
    const entity = org.legalForm ? `${org.name}, ${org.legalForm}` : org.name;
    parts.push(entity);
  }

  if (org.shareCapital && org.shareCapital.trim()) {
    parts.push(`au capital de ${org.shareCapital.trim()}`);
  }

  if (org.billingSiret) {
    const rcs = org.rcsCity ? `RCS ${org.rcsCity} ` : 'SIRET ';
    parts.push(`${rcs}${org.billingSiret}`);
  }

  if (org.billingVatNumber) {
    parts.push(`TVA intracommunautaire : ${org.billingVatNumber}`);
  }

  const address = org.legalAddress || org.address;
  const city = org.legalCity || org.city;
  const postalCode = org.legalPostalCode || org.postalCode;
  if (address && city && postalCode) {
    parts.push(`Siège social : ${address}, ${postalCode} ${city}`);
  }

  if (parts.length === 0) {
    return res.json({
      suggestion: '',
      message:
        'Remplissez les mentions légales (forme juridique, capital, RCS) pour générer le pied de page',
    });
  }

  return res.json({
    suggestion: parts.join(' — '),
    message: null,
  });
});

const onboardingCompleteSchema = z.object({
  plan: z.enum(['starter', 'pro', 'business']),
  companyName: z.string().min(2).max(200),
  siret: z.string().min(1).max(20),
  address: z.string().min(3).max(300),
  postalCode: z.string().min(4).max(10),
  city: z.string().min(2).max(100),
  country: z.string().length(2).default('FR'),
  adminName: z.string().min(2).max(120),
  phone: z.string().min(8).max(24),
  billingEmail: z.string().email().max(200),
  vatNumber: z.string().max(20).optional().nullable(),
});

/** Finalise plan + infos société obligatoires avant utilisation de l'app. */
router.post('/onboarding/complete', requireRoles('ADMIN'), async (req, res) => {
  const parsed = onboardingCompleteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Données invalides', details: parsed.error.flatten() });
  }

  const orgId = req.user!.organizationId!;
  const userId = req.user!.sub;
  const existing = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!existing) return res.status(404).json({ error: 'Organisation introuvable' });
  if (existing.onboardingCompletedAt) {
    return res.status(409).json({ error: 'Configuration déjà finalisée' });
  }

  const siret = normalizeSiret(parsed.data.siret);
  if (!siret) {
    return res.status(400).json({ error: 'SIRET invalide (14 chiffres attendus)' });
  }

  const billingEmail = parsed.data.billingEmail.trim().toLowerCase();
  if (!isValidEmail(billingEmail)) {
    return res.status(400).json({ error: 'Email de facturation invalide' });
  }

  const vatNumber = normalizeVatNumber(parsed.data.vatNumber);
  if (parsed.data.vatNumber?.trim() && !vatNumber) {
    return res.status(400).json({ error: 'N° de TVA intracommunautaire invalide' });
  }

  const plan = slugToSubscriptionPlan(parsed.data.plan);
  if (!plan) return res.status(400).json({ error: 'Offre invalide' });

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);
  const companyName = parsed.data.companyName.trim();

  try {
    const [org, user] = await prisma.$transaction([
      prisma.organization.update({
        where: { id: orgId },
        data: {
          name: companyName,
          billingLegalName: companyName,
          billingSiret: siret,
          taxMatricule: siret,
          billingVatNumber: vatNumber,
          billingEmail,
          address: parsed.data.address.trim(),
          postalCode: parsed.data.postalCode.trim(),
          city: parsed.data.city.trim(),
          country: parsed.data.country.toUpperCase(),
          subscriptionPlan: plan,
          billingStatus: 'TRIAL',
          trialEndsAt,
          onboardingCompletedAt: new Date(),
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          name: parsed.data.adminName.trim(),
          phone: parsed.data.phone.trim(),
        },
      }),
    ]);

    return res.json({
      organization: org,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        organizationId: user.organizationId,
      },
    });
  } catch (err) {
    logger.error({ err }, 'onboarding/complete failed');
    return res.status(500).json({
      error: 'Impossible de finaliser la configuration. Réessayez ou contactez le support.',
    });
  }
});

router.use(requireOnboardingComplete);

router.post('/logo', requireRoles('ADMIN'), logoUpload.single('logo'), async (req, res) => {
  const orgId = req.user!.organizationId!;
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'Fichier logo requis' });
  }
  try {
    const logoUrl = await saveOrgLogoFile(orgId, file.buffer, file.mimetype);
    const org = await prisma.organization.update({
      where: { id: orgId },
      data: { logoUrl },
    });
    return res.json({ logoUrl: org.logoUrl });
  } catch (err) {
    if (err instanceof Error && err.message === 'UNSUPPORTED_LOGO_TYPE') {
      return res.status(400).json({
        error: 'Format image non supporté (PNG, JPEG, WebP, GIF, SVG)',
      });
    }
    logger.error({ err }, 'organizations/logo upload failed');
    return res.status(500).json({ error: 'Impossible d’enregistrer le logo' });
  }
});

router.delete('/logo', requireRoles('ADMIN'), async (req, res) => {
  const orgId = req.user!.organizationId!;
  await deleteOrgLogoFiles(orgId);
  const org = await prisma.organization.update({
    where: { id: orgId },
    data: { logoUrl: null },
  });
  return res.json({ logoUrl: org.logoUrl });
});

/** PDF vierge avec le gabarit « autre document » (aperçu en-tête + pied configuré). */
router.get('/other-document/pdf', async (req, res) => {
  const orgId = req.user!.organizationId!;
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) return res.status(404).json({ error: 'Organisation introuvable' });
  streamOtherDocumentPdf(res, {
    title: 'DOCUMENT',
    template: org.otherDocumentPdfTemplate,
    accentColor: resolvePdfAccent(org, 'other'),
    footerText: org.documentFooterText,
    defaultFooterLine: `${APP_BRAND} — Document généré automatiquement.`,
    generatedAt: new Date(),
    org: {
      name: org.name,
      logoUrl: org.logoUrl,
      taxMatricule: org.taxMatricule,
      address: org.address,
      city: org.city,
    },
  });
});

const appearanceConfigSchema = z.object({
  logoScale: z.number().min(25).max(300).optional(),
  logoPosition: z.enum(['left', 'top', 'header']).optional(),
  logoCentered: z.boolean().optional(),
  hideCompanyName: z.boolean().optional(),
  hideSlogan: z.boolean().optional(),
  hideAddress: z.boolean().optional(),
  hidePhone: z.boolean().optional(),
  hideEmail: z.boolean().optional(),
  hideWebsite: z.boolean().optional(),
  hideSiret: z.boolean().optional(),
  hideVat: z.boolean().optional(),
});

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  logoUrl: z.string().max(1_000_000).nullable().optional(),
  taxMatricule: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  country: z.string().min(2).optional(),
  defaultCurrency: z.string().min(3).max(3).optional(),
  defaultVatRate: z.number().min(0).max(100).optional(),
  invoicePrefix: z
    .string()
    .min(1)
    .max(24)
    .regex(/^[A-Za-z0-9-]+$/)
    .optional(),
  quotePrefix: z
    .string()
    .min(1)
    .max(24)
    .regex(/^[A-Za-z0-9-]+$/)
    .optional(),
  depositPrefix: z
    .string()
    .min(1)
    .max(24)
    .regex(/^[A-Za-z0-9-]+$/)
    .optional(),
  invoiceNumberFormat: z.string().min(3).max(64).optional(),
  quoteNumberFormat: z.string().min(3).max(64).optional(),
  depositNumberFormat: z.string().min(3).max(64).optional(),
  invoiceResetYearly: z.boolean().optional(),
  quoteResetYearly: z.boolean().optional(),
  depositResetYearly: z.boolean().optional(),
  invoicePdfTemplate: z.nativeEnum(PdfDocumentTemplate).optional(),
  quotePdfTemplate: z.nativeEnum(PdfDocumentTemplate).optional(),
  otherDocumentPdfTemplate: z.nativeEnum(PdfDocumentTemplate).optional(),
  pdfPrimaryColor: z.string().max(7).optional(),
  pdfFontFamily: z.string().max(64).optional(),
  pdfAppearance: z
    .union([
      appearanceConfigSchema,
      z.object({
        mode: z.enum(['unified', 'per_document']),
        unified: appearanceConfigSchema,
        invoice: appearanceConfigSchema.optional(),
        quote: appearanceConfigSchema.optional(),
        other: appearanceConfigSchema.optional(),
      }),
    ])
    .optional(),
  invoicePdfAccentColor: z.string().max(7).nullable().optional(),
  quotePdfAccentColor: z.string().max(7).nullable().optional(),
  otherDocumentPdfAccentColor: z.string().max(7).nullable().optional(),
  documentFooterText: z.string().max(2000).nullable().optional(),
  vatOnDebitsEnabled: z.boolean().optional(),
  isMicroEntrepreneur: z.boolean().optional(),
  stockManagementEnabled: z.boolean().optional(),
  paProvider: z.enum(['NONE', 'MOCK']).optional(),
  paAccountRef: z.string().max(200).nullable().optional(),
  /** Mentions légales structurées pour génération du pied de page */
  legalForm: z.string().max(100).nullable().optional(),
  shareCapital: z.string().max(100).nullable().optional(),
  rcsCity: z.string().max(100).nullable().optional(),
  legalAddress: z.string().max(255).nullable().optional(),
  legalPostalCode: z.string().max(20).nullable().optional(),
  legalCity: z.string().max(100).nullable().optional(),
});

router.patch('/', requireRoles('ADMIN'), async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Données invalides', details: parsed.error.flatten() });
  }
  const orgId = req.user!.organizationId!;
  const existing = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!existing) return res.status(404).json({ error: 'Organisation introuvable' });

  const pdfPatch = sanitizePdfSettingsPatch(existing, {
    invoicePdfTemplate: parsed.data.invoicePdfTemplate,
    quotePdfTemplate: parsed.data.quotePdfTemplate,
    otherDocumentPdfTemplate: parsed.data.otherDocumentPdfTemplate,
    pdfPrimaryColor: parsed.data.pdfPrimaryColor,
    invoicePdfAccentColor: parsed.data.invoicePdfAccentColor,
    quotePdfAccentColor: parsed.data.quotePdfAccentColor,
    otherDocumentPdfAccentColor: parsed.data.otherDocumentPdfAccentColor,
  });

  const data = { ...parsed.data, ...pdfPatch };
  if (data.pdfPrimaryColor) {
    data.pdfPrimaryColor = normalizeHexColor(data.pdfPrimaryColor);
  }

  if (data.invoiceNumberFormat !== undefined && !validateNumberFormat(data.invoiceNumberFormat)) {
    return res.status(400).json({
      error: 'Format facture invalide — utilisez {PREFIX}, {YYYY}, {SEQ} ou {SEQ:n}',
    });
  }
  if (data.quoteNumberFormat !== undefined && !validateNumberFormat(data.quoteNumberFormat)) {
    return res.status(400).json({
      error: 'Format devis invalide — utilisez {PREFIX}, {YYYY}, {SEQ} ou {SEQ:n}',
    });
  }
  if (data.depositNumberFormat !== undefined && !validateNumberFormat(data.depositNumberFormat)) {
    return res.status(400).json({
      error: 'Format acompte invalide — utilisez {PREFIX}, {YYYY}, {SEQ} ou {SEQ:n}',
    });
  }

  const paPatch: Record<string, unknown> = {};
  if (parsed.data.paProvider !== undefined) {
    paPatch.paProvider = parsed.data.paProvider;
    paPatch.paConnectedAt = parsed.data.paProvider === 'NONE' ? null : new Date();
    if (parsed.data.paProvider === 'NONE') paPatch.paAccountRef = null;
  }
  if (parsed.data.paAccountRef !== undefined) {
    paPatch.paAccountRef = parsed.data.paAccountRef;
  }

  if (parsed.data.stockManagementEnabled === false) {
    const stockableCount = await prisma.product.count({
      where: {
        organizationId: orgId,
        kind: PRODUCT_KIND.PRODUCT,
        isActive: true,
      },
    });
    if (stockableCount > 0) {
      return res.status(400).json({
        error:
          'Impossible de désactiver le stock : des produits stockables existent encore dans votre catalogue.',
        code: 'HAS_STOCKABLE_PRODUCTS',
      });
    }
  }

  const org = await prisma.organization.update({
    where: { id: orgId },
    data: {
      ...data,
      ...paPatch,
      ...(parsed.data.pdfFontFamily !== undefined
        ? { pdfFontFamily: parsed.data.pdfFontFamily }
        : {}),
      ...(parsed.data.pdfAppearance !== undefined
        ? { pdfAppearance: parsed.data.pdfAppearance as Prisma.InputJsonValue }
        : {}),
      ...(data.defaultVatRate !== undefined
        ? { defaultVatRate: new Prisma.Decimal(data.defaultVatRate) }
        : {}),
    },
  });
  return res.json(org);
});

router.get('/numbering/preview', async (req, res) => {
  const orgId = req.user!.organizationId!;
  const type =
    req.query.type === 'quote' ? 'quote' : req.query.type === 'deposit' ? 'deposit' : 'invoice';
  const issueDateRaw = typeof req.query.issueDate === 'string' ? req.query.issueDate : undefined;
  const issueDate = issueDateRaw ? new Date(issueDateRaw) : new Date();
  if (Number.isNaN(issueDate.getTime())) {
    return res.status(400).json({ error: 'Date invalide' });
  }

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) return res.status(404).json({ error: 'Organisation introuvable' });

  const preview = previewNextDocumentNumber(org, type as DocumentNumberType, issueDate);
  return res.json({
    type,
    issueDate: issueDate.toISOString(),
    nextNumber: preview.number,
    nextSequence: preview.nextSequence,
    presets: NUMBER_FORMAT_PRESETS,
  });
});

router.get('/users', async (req, res) => {
  const orgId = req.user!.organizationId!;
  const users = await prisma.user.findMany({
    where: { organizationId: orgId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  return res.json(users);
});

router.get('/users/seats', async (req, res) => {
  const orgId = req.user!.organizationId!;
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { subscriptionPlan: true },
  });
  if (!org) return res.status(404).json({ error: 'Organisation introuvable' });

  const max = maxUsersForPlan(org.subscriptionPlan);
  const seats = await countOrganizationSeats(orgId);
  return res.json({
    plan: org.subscriptionPlan,
    max,
    activeUsers: seats.activeUsers,
    pendingInvites: seats.pendingInvites,
    used: seats.total,
    remaining: Math.max(0, max - seats.total),
    canAdd: seats.total < max,
  });
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(120),
  role: z.enum(['ADMIN', 'USER']).default('USER'),
});

router.post('/users', requireRoles('ADMIN'), async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Données invalides', details: parsed.error.flatten() });
  }

  const orgId = req.user!.organizationId!;
  const email = parsed.data.email.trim().toLowerCase();

  try {
    await assertCanAddOrgSeat(orgId);
  } catch (e) {
    if (e instanceof SeatLimitError) {
      return res.status(403).json({
        error: `Limite atteinte : ${e.max} utilisateur(s) maximum sur votre offre.`,
        code: e.code,
        max: e.max,
        plan: e.plan,
      });
    }
    throw e;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'Cet email est déjà utilisé sur la plateforme' });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: parsed.data.name.trim(),
      role: parsed.data.role as UserRole,
      organizationId: orgId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });
  return res.status(201).json(user);
});

const inviteUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120).optional(),
  role: z.enum(['ADMIN', 'USER']).default('USER'),
});

router.post('/users/invite', requireRoles('ADMIN'), async (req, res) => {
  const parsed = inviteUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Données invalides', details: parsed.error.flatten() });
  }

  const orgId = req.user!.organizationId!;
  const inviterId = req.user!.sub;
  const email = parsed.data.email.trim().toLowerCase();

  try {
    await assertCanAddOrgSeat(orgId);
  } catch (e) {
    if (e instanceof SeatLimitError) {
      return res.status(403).json({
        error: `Limite atteinte : ${e.max} utilisateur(s) maximum sur votre offre.`,
        code: e.code,
        max: e.max,
        plan: e.plan,
      });
    }
    throw e;
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    if (existingUser.organizationId === orgId) {
      return res.status(409).json({ error: 'Cet utilisateur fait déjà partie de votre équipe' });
    }
    return res.status(409).json({ error: 'Cet email est déjà utilisé sur la plateforme' });
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true },
  });
  if (!org) return res.status(404).json({ error: 'Organisation introuvable' });

  const inviter = await prisma.user.findUnique({
    where: { id: inviterId },
    select: { name: true },
  });

  const token = generateInviteToken();
  const invitation = await prisma.userInvitation.upsert({
    where: {
      organizationId_email: { organizationId: orgId, email },
    },
    create: {
      organizationId: orgId,
      email,
      name: parsed.data.name?.trim() ?? null,
      role: parsed.data.role as UserRole,
      token,
      invitedById: inviterId,
      expiresAt: inviteExpiresAt(7),
    },
    update: {
      name: parsed.data.name?.trim() ?? null,
      role: parsed.data.role as UserRole,
      token,
      invitedById: inviterId,
      expiresAt: inviteExpiresAt(7),
      acceptedAt: null,
    },
  });

  const inviteUrl = `${getFrontendBaseUrl()}/invite?token=${token}`;
  const roleLabel = parsed.data.role === 'ADMIN' ? 'Administrateur' : 'Utilisateur';
  const emailSent = await sendUserInviteEmail({
    to: email,
    inviteeName: invitation.name,
    organizationName: org.name,
    inviterName: inviter?.name ?? null,
    inviteUrl,
    roleLabel,
  });

  return res.status(201).json({
    id: invitation.id,
    email: invitation.email,
    name: invitation.name,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
    emailSent,
    inviteUrl: emailSent ? undefined : inviteUrl,
  });
});

router.get('/users/invitations', requireRoles('ADMIN'), async (req, res) => {
  const orgId = req.user!.organizationId!;
  const now = new Date();
  const invitations = await prisma.userInvitation.findMany({
    where: { organizationId: orgId, acceptedAt: null, expiresAt: { gt: now } },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return res.json(invitations);
});

router.delete('/users/invitations/:id', requireRoles('ADMIN'), async (req, res) => {
  const orgId = req.user!.organizationId!;
  const inv = await prisma.userInvitation.findFirst({
    where: { id: req.params.id, organizationId: orgId, acceptedAt: null },
  });
  if (!inv) return res.status(404).json({ error: 'Invitation introuvable' });
  await prisma.userInvitation.delete({ where: { id: inv.id } });
  return res.status(204).send();
});

const patchUserSchema = z.object({
  role: z.enum(['ADMIN', 'USER']).optional(),
  isActive: z.boolean().optional(),
  name: z.string().min(1).max(120).optional(),
});

async function countActiveAdmins(orgId: string, excludeUserId?: string): Promise<number> {
  return prisma.user.count({
    where: {
      organizationId: orgId,
      role: 'ADMIN',
      isActive: true,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
  });
}

router.patch('/users/:id', requireRoles('ADMIN'), async (req, res) => {
  const parsed = patchUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Données invalides', details: parsed.error.flatten() });
  }

  const orgId = req.user!.organizationId!;
  const targetId = req.params.id;
  if (targetId === req.user!.sub && parsed.data.isActive === false) {
    return res.status(400).json({ error: 'Vous ne pouvez pas désactiver votre propre compte' });
  }

  const target = await prisma.user.findFirst({
    where: { id: targetId, organizationId: orgId },
  });
  if (!target) return res.status(404).json({ error: 'Utilisateur introuvable' });

  if (parsed.data.role === 'USER' || parsed.data.isActive === false) {
    const otherAdmins = await countActiveAdmins(orgId, targetId);
    if (target.role === 'ADMIN' && otherAdmins === 0) {
      return res.status(400).json({
        error: "Il doit rester au moins un administrateur actif dans l'organisation",
      });
    }
  }

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: {
      ...(parsed.data.role !== undefined ? { role: parsed.data.role as UserRole } : {}),
      ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
      ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });
  return res.json(updated);
});

// Custom taxes routes
router.get('/custom-taxes', async (req, res) => {
  const orgId = req.user!.organizationId!;
  const taxes = await prisma.customTax.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'asc' },
  });
  return res.json(taxes);
});

const customTaxSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['PERCENTAGE', 'FIXED']),
  value: z.number().min(0),
});

router.post('/custom-taxes', requireRoles('ADMIN'), async (req, res) => {
  const parsed = customTaxSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Données invalides', details: parsed.error.flatten() });
  }
  const orgId = req.user!.organizationId!;
  const tax = await prisma.customTax.create({
    data: {
      organizationId: orgId,
      ...parsed.data,
      value: new Prisma.Decimal(parsed.data.value),
    },
  });
  return res.status(201).json(tax);
});

router.patch('/custom-taxes/:id', requireRoles('ADMIN'), async (req, res) => {
  const parsed = customTaxSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Données invalides', details: parsed.error.flatten() });
  }
  const orgId = req.user!.organizationId!;
  const tax = await prisma.customTax.findFirst({
    where: { id: req.params.id, organizationId: orgId },
  });
  if (!tax) return res.status(404).json({ error: 'Taxe introuvable' });

  const updated = await prisma.customTax.update({
    where: { id: req.params.id },
    data: {
      ...parsed.data,
      ...(parsed.data.value !== undefined ? { value: new Prisma.Decimal(parsed.data.value) } : {}),
    },
  });
  return res.json(updated);
});

router.delete('/custom-taxes/:id', requireRoles('ADMIN'), async (req, res) => {
  const orgId = req.user!.organizationId!;
  const tax = await prisma.customTax.findFirst({
    where: { id: req.params.id, organizationId: orgId },
  });
  if (!tax) return res.status(404).json({ error: 'Taxe introuvable' });

  await prisma.customTax.delete({ where: { id: req.params.id } });
  return res.status(204).send();
});

export default router;
