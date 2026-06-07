/**
 * Client frontend pour la signature électronique TunTrust DIGIGO
 *
 * Flux :
 *   1. signInvoice / signQuote → reçoit sessionId + authRedirectUrl
 *   2. Redirection utilisateur vers 2FA (PIN + SMS OTP)
 *   3. pollSignatureStatus → vérifie le résultat après 2FA
 */

import { apiFetch } from '@/lib/api-client';

// ─── Types ───────────────────────────────────────────────

export type SignatureFormat = 'XAdES' | 'PAdES' | 'CAdES' | 'ASiC';
export type SignatureLevel = 'B-B' | 'B-T' | 'B-LT' | 'B-LTA';

export interface SignRequest {
  signatureFormat?: SignatureFormat;
  signatureLevel?: SignatureLevel;
  signerPhone: string;
}

export interface SignSessionResponse {
  sessionId: string;
  authRedirectUrl: string;
  status: 'PENDING_2FA' | 'SIGNED' | 'EXPIRED' | 'FAILED';
  expiresAt: string;
  message: string;
}

export interface SignatureResult {
  sessionId: string;
  status: 'SIGNED' | 'PENDING_2FA' | 'EXPIRED' | 'FAILED';
  signatureValue: string | null;
  signerCertificate: string | null;
  signedAt: string | null;
  ocspResponse: string | null;
}

export interface SignatureStatus {
  configured: boolean;
  provider: string;
  api: string;
  supportedFormats: SignatureFormat[];
  supportedLevels: SignatureLevel[];
}

// ─── API Calls ───────────────────────────────────────────

/**
 * Vérifie si la signature électronique est configurée sur le backend
 */
export async function getSignatureServiceStatus(): Promise<SignatureStatus> {
  return apiFetch<SignatureStatus>('/signatures/status');
}

/**
 * Initier la signature d'une facture
 */
export async function signInvoice(
  invoiceId: string,
  request: SignRequest
): Promise<SignSessionResponse> {
  return apiFetch<SignSessionResponse>(`/signatures/invoices/${invoiceId}/sign`, {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Initier la signature d'un devis
 */
export async function signQuote(
  quoteId: string,
  request: SignRequest
): Promise<SignSessionResponse> {
  return apiFetch<SignSessionResponse>(`/signatures/quotes/${quoteId}/sign`, {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Vérifier le statut d'une session de signature
 */
export async function getSessionStatus(sessionId: string): Promise<SignatureResult> {
  return apiFetch<SignatureResult>(`/signatures/sessions/${sessionId}`);
}

/**
 * Polling du statut de signature après redirection 2FA
 * Vérifie toutes les `intervalMs` ms pendant `timeoutMs` ms max
 */
export async function pollSignatureStatus(
  sessionId: string,
  options: { intervalMs?: number; timeoutMs?: number } = {}
): Promise<SignatureResult> {
  const interval = options.intervalMs ?? 3000;
  const timeout = options.timeoutMs ?? 120000; // 2 min max
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const result = await getSessionStatus(sessionId);

    if (result.status === 'SIGNED' || result.status === 'FAILED' || result.status === 'EXPIRED') {
      return result;
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  return {
    sessionId,
    status: 'EXPIRED',
    signatureValue: null,
    signerCertificate: null,
    signedAt: null,
    ocspResponse: null,
  };
}

/**
 * Vérifier une signature
 */
export async function verifySignature(params: {
  documentHash: string;
  signatureValue: string;
  signatureFormat: SignatureFormat;
}): Promise<{
  valid: boolean;
  signerName: string;
  signedAt: string;
  certificateStatus: 'GOOD' | 'REVOKED' | 'UNKNOWN';
}> {
  return apiFetch('/signatures/verify', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
