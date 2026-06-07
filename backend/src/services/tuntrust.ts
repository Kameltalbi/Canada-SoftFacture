/**
 * Service d'intégration TunTrust — API DIGIGO (SCAL 2)
 *
 * Architecture de signature à distance :
 *   1. Préparer le document (hash)
 *   2. Envoyer le hash à l'API DIGIGO
 *   3. L'utilisateur s'authentifie via 2FA (PIN + SMS OTP)
 *   4. Récupérer le hash signé
 *   5. Construire le document signé (XAdES, PAdES, CAdES ou ASiC)
 *
 * Formats de signature ETSI supportés :
 *   - XAdES (XML)  → e-factures XML / UBL
 *   - PAdES (PDF)  → factures PDF signées
 *   - CAdES (CMS)  → signature binaire
 *   - ASiC          → conteneur de signature
 *
 * Prérequis :
 *   - Accord contractuel avec TunTrust (EI — Entité d'Intégration)
 *   - Certificat d'homologation validé par TunTrust
 *   - Credentials API DIGIGO (client_id, client_secret, api_key)
 */

import crypto from 'crypto';
import { logger } from '../lib/logger.js';

// ─── Types ───────────────────────────────────────────────

export type SignatureFormat = 'XAdES' | 'PAdES' | 'CAdES' | 'ASiC';

export type SignatureLevel =
  | 'B-B' // Basic
  | 'B-T' // Timestamp
  | 'B-LT' // Long-Term
  | 'B-LTA'; // Long-Term with Archive

export interface TunTrustConfig {
  apiBaseUrl: string;
  clientId: string;
  clientSecret: string;
  apiKey: string;
  callbackUrl: string;
}

export interface SignHashRequest {
  /** SHA-256 hash du document à signer (hex) */
  documentHash: string;
  /** Algorithme de hash utilisé */
  hashAlgorithm: 'SHA-256' | 'SHA-384' | 'SHA-512';
  /** Format de signature souhaité */
  signatureFormat: SignatureFormat;
  /** Niveau de signature */
  signatureLevel: SignatureLevel;
  /** Identifiant du signataire (email ou identifiant TunTrust) */
  signerId: string;
  /** Numéro de téléphone pour OTP */
  signerPhone: string;
  /** Métadonnées du document */
  documentMetadata: {
    type: 'INVOICE' | 'QUOTE';
    number: string;
    issueDate: string;
  };
}

export interface SignSessionResponse {
  /** ID de session de signature */
  sessionId: string;
  /** URL de redirection 2FA (PIN + SMS OTP) */
  authRedirectUrl: string;
  /** Statut de la session */
  status: 'PENDING_2FA' | 'SIGNED' | 'EXPIRED' | 'FAILED';
  /** Expire à */
  expiresAt: string;
}

export interface SignatureResult {
  /** ID de session */
  sessionId: string;
  /** Statut */
  status: 'SIGNED' | 'PENDING_2FA' | 'EXPIRED' | 'FAILED';
  /** Signature (base64) — null si pas encore signé */
  signatureValue: string | null;
  /** Certificat du signataire (base64) */
  signerCertificate: string | null;
  /** Timestamp de signature */
  signedAt: string | null;
  /** Informations OCSP */
  ocspResponse: string | null;
}

export interface OCSPStatus {
  certificateId: string;
  status: 'GOOD' | 'REVOKED' | 'UNKNOWN';
  checkedAt: string;
}

// ─── Service ─────────────────────────────────────────────

export class TunTrustService {
  private config: TunTrustConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: TunTrustConfig) {
    this.config = config;
  }

  // ── Auth ────────────────────────────────────────────────

  /**
   * Obtenir un token d'accès OAuth2 auprès de l'API DIGIGO
   */
  private async authenticate(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    logger.info('TunTrust: Authenticating with DIGIGO API');

    const response = await fetch(`${this.config.apiBaseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-API-Key': this.config.apiKey,
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        scope: 'sign hash verify certificate',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error({ status: response.status, error }, 'TunTrust: Auth failed');
      throw new Error(`TunTrust authentication failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
    };

    this.accessToken = data.access_token;
    // Renouveler 60s avant expiration
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;

    return this.accessToken;
  }

  /**
   * Helper pour les requêtes authentifiées
   */
  private async apiRequest<T>(
    path: string,
    options: { method?: string; body?: unknown } = {}
  ): Promise<T> {
    const token = await this.authenticate();

    const response = await fetch(`${this.config.apiBaseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error({ path, status: response.status, error }, 'TunTrust: API error');
      throw new Error(`TunTrust API error ${path}: ${response.status}`);
    }

    return (await response.json()) as T;
  }

  // ── Hash ────────────────────────────────────────────────

  /**
   * Calculer le hash SHA-256 d'un document (Buffer ou string)
   */
  static computeHash(
    document: Buffer | string,
    algorithm: 'SHA-256' | 'SHA-384' | 'SHA-512' = 'SHA-256'
  ): string {
    const alg = algorithm.replace('-', '').toLowerCase(); // sha256
    return crypto.createHash(alg).update(document).digest('hex');
  }

  // ── Signature Flow ──────────────────────────────────────

  /**
   * Étape 1 : Initier une session de signature
   * Envoie le hash à DIGIGO et reçoit l'URL de redirection 2FA
   */
  async initiateSignature(request: SignHashRequest): Promise<SignSessionResponse> {
    logger.info(
      { format: request.signatureFormat, docNumber: request.documentMetadata.number },
      'TunTrust: Initiating signature session'
    );

    return this.apiRequest<SignSessionResponse>('/api/v1/signatures/sessions', {
      method: 'POST',
      body: {
        hash: request.documentHash,
        hashAlgorithm: request.hashAlgorithm,
        signatureFormat: request.signatureFormat,
        signatureLevel: request.signatureLevel,
        signer: {
          id: request.signerId,
          phone: request.signerPhone,
        },
        callbackUrl: this.config.callbackUrl,
        metadata: request.documentMetadata,
      },
    });
  }

  /**
   * Étape 2 : Vérifier le statut d'une session de signature
   * Appelé après 2FA ou via webhook callback
   */
  async getSignatureStatus(sessionId: string): Promise<SignatureResult> {
    logger.info({ sessionId }, 'TunTrust: Checking signature status');

    return this.apiRequest<SignatureResult>(`/api/v1/signatures/sessions/${sessionId}`);
  }

  /**
   * Étape 3 : Récupérer la signature complète après 2FA
   */
  async getSignedHash(sessionId: string): Promise<{
    signatureValue: string;
    certificate: string;
    timestamp: string;
    ocsp: string;
  }> {
    logger.info({ sessionId }, 'TunTrust: Retrieving signed hash');

    return this.apiRequest(`/api/v1/signatures/sessions/${sessionId}/result`);
  }

  // ── Vérification ────────────────────────────────────────

  /**
   * Vérifier la validité d'une signature
   */
  async verifySignature(params: {
    documentHash: string;
    signatureValue: string;
    signatureFormat: SignatureFormat;
  }): Promise<{
    valid: boolean;
    signerName: string;
    signedAt: string;
    certificateStatus: 'GOOD' | 'REVOKED' | 'UNKNOWN';
  }> {
    logger.info('TunTrust: Verifying signature');

    return this.apiRequest('/api/v1/signatures/verify', {
      method: 'POST',
      body: params,
    });
  }

  /**
   * Vérifier le statut OCSP d'un certificat
   */
  async checkCertificateStatus(certificateId: string): Promise<OCSPStatus> {
    return this.apiRequest(`/api/v1/certificates/${certificateId}/ocsp`);
  }

  // ── Timestamp ───────────────────────────────────────────

  /**
   * Obtenir un timestamp qualifié (RFC 3161)
   */
  async getTimestamp(documentHash: string): Promise<{
    timestampToken: string;
    generatedAt: string;
  }> {
    return this.apiRequest('/api/v1/timestamps', {
      method: 'POST',
      body: { hash: documentHash, hashAlgorithm: 'SHA-256' },
    });
  }
}

// ─── Singleton ───────────────────────────────────────────

let tunTrustInstance: TunTrustService | null = null;

export function getTunTrustService(): TunTrustService {
  if (!tunTrustInstance) {
    const baseUrl = process.env.TUNTRUST_API_URL;
    const clientId = process.env.TUNTRUST_CLIENT_ID;
    const clientSecret = process.env.TUNTRUST_CLIENT_SECRET;
    const apiKey = process.env.TUNTRUST_API_KEY;
    const callbackUrl = process.env.TUNTRUST_CALLBACK_URL;

    if (!baseUrl || !clientId || !clientSecret || !apiKey || !callbackUrl) {
      throw new Error(
        'TunTrust DIGIGO config manquante. Variables requises : ' +
          'TUNTRUST_API_URL, TUNTRUST_CLIENT_ID, TUNTRUST_CLIENT_SECRET, TUNTRUST_API_KEY, TUNTRUST_CALLBACK_URL'
      );
    }

    tunTrustInstance = new TunTrustService({
      apiBaseUrl: baseUrl,
      clientId,
      clientSecret,
      apiKey,
      callbackUrl,
    });
  }

  return tunTrustInstance;
}
