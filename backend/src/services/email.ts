import nodemailer from 'nodemailer';
import { APP_BRAND } from '../lib/appBrand.js';
import { logger } from '../lib/logger.js';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let transporter: nodemailer.Transporter | null = null;

export function initializeEmailService() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logger.warn('Email service not configured: Missing SMTP credentials');
    return;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  logger.info('Email service initialized');
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!transporter) {
    logger.warn('Email service not available');
    return false;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    logger.info({ to: options.to, subject: options.subject }, 'Email sent successfully');
    return true;
  } catch (error) {
    logger.error({ error, to: options.to }, 'Failed to send email');
    return false;
  }
}

export async function sendInvoiceEmail(
  clientEmail: string,
  clientName: string,
  invoiceNumber: string,
  invoicePdfUrl?: string
): Promise<boolean> {
  const subject = `Facture ${invoiceNumber} — ${APP_BRAND}`;
  const html = `
    <h1>Bonjour ${clientName},</h1>
    <p>Votre facture <strong>${invoiceNumber}</strong> est disponible.</p>
    ${invoicePdfUrl ? `<p>Vous pouvez la télécharger en cliquant sur ce lien : <a href="${invoicePdfUrl}">Télécharger la facture</a></p>` : ''}
    <p>Cordialement,<br>L'équipe ${APP_BRAND}</p>
  `;

  return sendEmail({
    to: clientEmail,
    subject,
    html,
  });
}

export async function sendQuoteEmail(
  clientEmail: string,
  clientName: string,
  quoteNumber: string,
  quotePdfUrl?: string
): Promise<boolean> {
  const subject = `Devis ${quoteNumber} — ${APP_BRAND}`;
  const html = `
    <h1>Bonjour ${clientName},</h1>
    <p>Votre devis <strong>${quoteNumber}</strong> est disponible.</p>
    ${quotePdfUrl ? `<p>Vous pouvez le télécharger en cliquant sur ce lien : <a href="${quotePdfUrl}">Télécharger le devis</a></p>` : ''}
    <p>Cordialement,<br>L'équipe ${APP_BRAND}</p>
  `;

  return sendEmail({
    to: clientEmail,
    subject,
    html,
  });
}

export async function sendPasswordResetEmail(options: {
  to: string;
  resetUrl: string;
}): Promise<boolean> {
  const subject = `Réinitialisation du mot de passe — ${APP_BRAND}`;
  const html = `
    <h1>Réinitialisation du mot de passe</h1>
    <p>Vous avez demandé à réinitialiser votre mot de passe ${APP_BRAND}.</p>
    <p><a href="${options.resetUrl}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;">Choisir un nouveau mot de passe</a></p>
    <p style="font-size:12px;color:#64748b;">Ce lien est valable 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
    <p>Cordialement,<br>${APP_BRAND}</p>
  `;
  return sendEmail({
    to: options.to,
    subject,
    html,
    text: `Réinitialisation du mot de passe ${APP_BRAND}\n${options.resetUrl}\n`,
  });
}

export async function sendUserInviteEmail(options: {
  to: string;
  inviteeName: string | null;
  organizationName: string;
  inviterName: string | null;
  inviteUrl: string;
  roleLabel: string;
}): Promise<boolean> {
  const greeting = options.inviteeName ? `Bonjour ${options.inviteeName},` : 'Bonjour,';
  const subject = `Invitation — ${options.organizationName} sur ${APP_BRAND}`;
  const html = `
    <h1>${greeting}</h1>
    <p><strong>${options.inviterName ?? 'Un administrateur'}</strong> vous invite à rejoindre
    <strong>${options.organizationName}</strong> sur ${APP_BRAND} (${options.roleLabel}).</p>
    <p><a href="${options.inviteUrl}" style="display:inline-block;padding:12px 20px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;">Accepter l'invitation</a></p>
    <p style="font-size:12px;color:#64748b;">Lien valable 7 jours.</p>
    <p>Cordialement,<br>${APP_BRAND} — Nexiora</p>
  `;
  return sendEmail({
    to: options.to,
    subject,
    html,
    text: `${greeting}\n${options.inviteUrl}\n`,
  });
}
