/**
 * Service d'envoi d'emails transactionnels bilingues FR/EN.
 *
 * Toutes les fonctions acceptent un paramètre `lang` ('fr' | 'en').
 * Par défaut : 'fr' (marché québécois). Passer 'en' pour les clients anglophones.
 *
 * Templates : HTML responsive, compatible tous clients mail (Gmail, Outlook, Apple Mail).
 */

import nodemailer from 'nodemailer';
import { APP_BRAND, APP_BRAND_FULL, APP_SUPPORT_EMAIL } from '../lib/appBrand.js';
import { logger } from '../lib/logger.js';

export type EmailLang = 'fr' | 'en';

// ─────────────────────────────────────────────────────────────────
// Initialisation du transporteur SMTP
// ─────────────────────────────────────────────────────────────────

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
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  logger.info('Email service initialized');
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!transporter) {
    logger.warn('Email service not available');
    return false;
  }
  try {
    await transporter.sendMail({
      from: `${APP_BRAND_FULL} <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    logger.info({ to: options.to, subject: options.subject }, 'Email sent');
    return true;
  } catch (error) {
    logger.error({ error, to: options.to }, 'Failed to send email');
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────
// Template HTML de base (wrapper responsive)
// ─────────────────────────────────────────────────────────────────

function emailWrapper(content: string, lang: EmailLang): string {
  const footerFr = `Vous recevez cet email car vous êtes inscrit sur <strong>${APP_BRAND_FULL}</strong>.<br>
    Pour toute question : <a href="mailto:${APP_SUPPORT_EMAIL}" style="color:#0f766e;">${APP_SUPPORT_EMAIL}</a>`;
  const footerEn = `You are receiving this email because you have an account on <strong>${APP_BRAND_FULL}</strong>.<br>
    Questions? <a href="mailto:${APP_SUPPORT_EMAIL}" style="color:#0f766e;">${APP_SUPPORT_EMAIL}</a>`;
  const footer = lang === 'en' ? footerEn : footerFr;

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${APP_BRAND_FULL}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

        <!-- Header -->
        <tr>
          <td style="background:#0f766e;padding:24px 32px;">
            <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">${APP_BRAND_FULL}</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 32px 28px;">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;font-size:12px;color:#64748b;line-height:1.6;">
            ${footer}
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Bouton CTA primaire */
function ctaButton(label: string, url: string, color = '#0f766e'): string {
  return `<p style="margin:24px 0;">
    <a href="${url}" style="display:inline-block;padding:13px 28px;background:${color};color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">${label}</a>
  </p>`;
}

/** Paragraphe de texte standard */
function p(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">${text}</p>`;
}

/** Titre H1 */
function h1(text: string): string {
  return `<h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#0f172a;">${text}</h1>`;
}

/** Note secondaire (petits caractères) */
function note(text: string): string {
  return `<p style="margin:16px 0 0;font-size:12px;color:#94a3b8;line-height:1.5;">${text}</p>`;
}

// ─────────────────────────────────────────────────────────────────
// Emails transactionnels
// ─────────────────────────────────────────────────────────────────

/** Facture envoyée au client */
export async function sendInvoiceEmail(
  clientEmail: string,
  clientName: string,
  invoiceNumber: string,
  lang: EmailLang = 'fr',
  invoicePdfUrl?: string
): Promise<boolean> {
  const fr = {
    subject: `Facture ${invoiceNumber} — ${APP_BRAND}`,
    greeting: `Bonjour ${clientName},`,
    body: `Votre facture <strong>${invoiceNumber}</strong> est disponible.`,
    cta: 'Télécharger la facture',
    closing: `Cordialement,<br><strong>L'équipe ${APP_BRAND_FULL}</strong>`,
  };
  const en = {
    subject: `Invoice ${invoiceNumber} — ${APP_BRAND}`,
    greeting: `Hello ${clientName},`,
    body: `Your invoice <strong>${invoiceNumber}</strong> is now available.`,
    cta: 'Download Invoice',
    closing: `Best regards,<br><strong>The ${APP_BRAND_FULL} Team</strong>`,
  };
  const t = lang === 'en' ? en : fr;

  const content = [
    h1(t.greeting),
    p(t.body),
    invoicePdfUrl ? ctaButton(t.cta, invoicePdfUrl) : '',
    p(t.closing),
  ].join('');

  return sendEmail({
    to: clientEmail,
    subject: t.subject,
    html: emailWrapper(content, lang),
    text:
      lang === 'en'
        ? `Hello ${clientName},\n\nYour invoice ${invoiceNumber} is available.\n${invoicePdfUrl ?? ''}`
        : `Bonjour ${clientName},\n\nVotre facture ${invoiceNumber} est disponible.\n${invoicePdfUrl ?? ''}`,
  });
}

/** Devis envoyé au client */
export async function sendQuoteEmail(
  clientEmail: string,
  clientName: string,
  quoteNumber: string,
  lang: EmailLang = 'fr',
  quotePdfUrl?: string
): Promise<boolean> {
  const fr = {
    subject: `Soumission ${quoteNumber} — ${APP_BRAND}`,
    greeting: `Bonjour ${clientName},`,
    body: `Votre soumission <strong>${quoteNumber}</strong> est disponible. Elle est valable 30 jours.`,
    cta: 'Voir la soumission',
    closing: `Cordialement,<br><strong>L'équipe ${APP_BRAND_FULL}</strong>`,
  };
  const en = {
    subject: `Quote ${quoteNumber} — ${APP_BRAND}`,
    greeting: `Hello ${clientName},`,
    body: `Your quote <strong>${quoteNumber}</strong> is available. It is valid for 30 days.`,
    cta: 'View Quote',
    closing: `Best regards,<br><strong>The ${APP_BRAND_FULL} Team</strong>`,
  };
  const t = lang === 'en' ? en : fr;

  const content = [
    h1(t.greeting),
    p(t.body),
    quotePdfUrl ? ctaButton(t.cta, quotePdfUrl, '#2563eb') : '',
    p(t.closing),
  ].join('');

  return sendEmail({
    to: clientEmail,
    subject: t.subject,
    html: emailWrapper(content, lang),
    text:
      lang === 'en'
        ? `Hello ${clientName},\n\nYour quote ${quoteNumber} is available.\n${quotePdfUrl ?? ''}`
        : `Bonjour ${clientName},\n\nVotre soumission ${quoteNumber} est disponible.\n${quotePdfUrl ?? ''}`,
  });
}

/** Réinitialisation du mot de passe */
export async function sendPasswordResetEmail(options: {
  to: string;
  resetUrl: string;
  lang?: EmailLang;
}): Promise<boolean> {
  const lang = options.lang ?? 'fr';
  const fr = {
    subject: `Réinitialisation du mot de passe — ${APP_BRAND}`,
    title: 'Réinitialisation du mot de passe',
    body: `Vous avez demandé la réinitialisation de votre mot de passe <strong>${APP_BRAND}</strong>.`,
    cta: 'Choisir un nouveau mot de passe',
    note: `Ce lien est valable <strong>1 heure</strong>. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email — votre mot de passe restera inchangé.`,
  };
  const en = {
    subject: `Password Reset — ${APP_BRAND}`,
    title: 'Reset your password',
    body: `You requested a password reset for your <strong>${APP_BRAND}</strong> account.`,
    cta: 'Set New Password',
    note: `This link is valid for <strong>1 hour</strong>. If you did not request this, please ignore this email — your password will remain unchanged.`,
  };
  const t = lang === 'en' ? en : fr;

  const content = [
    h1(t.title),
    p(t.body),
    ctaButton(t.cta, options.resetUrl, '#dc2626'),
    note(t.note),
  ].join('');

  return sendEmail({
    to: options.to,
    subject: t.subject,
    html: emailWrapper(content, lang),
    text:
      lang === 'en'
        ? `Reset your ${APP_BRAND} password:\n${options.resetUrl}\n`
        : `Réinitialisation ${APP_BRAND} :\n${options.resetUrl}\n`,
  });
}

/** Invitation d'un utilisateur */
export async function sendUserInviteEmail(options: {
  to: string;
  inviteeName: string | null;
  organizationName: string;
  inviterName: string | null;
  inviteUrl: string;
  roleLabel: string;
  lang?: EmailLang;
}): Promise<boolean> {
  const lang = options.lang ?? 'fr';
  const name = options.inviteeName ?? (lang === 'en' ? 'there' : '');
  const inviter = options.inviterName ?? (lang === 'en' ? 'An administrator' : 'Un administrateur');

  const fr = {
    subject: `Invitation à rejoindre ${options.organizationName} — ${APP_BRAND}`,
    title: `Bonjour${name ? ` ${name}` : ''},`,
    body: `<strong>${inviter}</strong> vous invite à rejoindre <strong>${options.organizationName}</strong> sur ${APP_BRAND_FULL} en tant que <strong>${options.roleLabel}</strong>.`,
    cta: "Accepter l'invitation",
    note: 'Ce lien est valable <strong>7 jours</strong>.',
  };
  const en = {
    subject: `Invitation to join ${options.organizationName} — ${APP_BRAND}`,
    title: `Hello${name ? ` ${name}` : ''},`,
    body: `<strong>${inviter}</strong> has invited you to join <strong>${options.organizationName}</strong> on ${APP_BRAND_FULL} as <strong>${options.roleLabel}</strong>.`,
    cta: 'Accept Invitation',
    note: 'This link is valid for <strong>7 days</strong>.',
  };
  const t = lang === 'en' ? en : fr;

  const content = [
    h1(t.title),
    p(t.body),
    ctaButton(t.cta, options.inviteUrl, '#059669'),
    note(t.note),
  ].join('');

  return sendEmail({
    to: options.to,
    subject: t.subject,
    html: emailWrapper(content, lang),
    text:
      lang === 'en'
        ? `${inviter} invited you to join ${options.organizationName} on ${APP_BRAND_FULL}.\n${options.inviteUrl}\n`
        : `${inviter} vous invite à rejoindre ${options.organizationName} sur ${APP_BRAND_FULL}.\n${options.inviteUrl}\n`,
  });
}
