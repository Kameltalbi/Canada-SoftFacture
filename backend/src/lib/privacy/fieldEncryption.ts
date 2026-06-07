/**
 * Chiffrement des champs sensibles au repos — Loi 25 art. 10, PIPEDA principe 7.
 *
 * Algorithme : AES-256-GCM (authentifié, résistant aux attaques de padding oracle).
 * Clé       : 256 bits dérivée de la variable d'env FIELD_ENCRYPTION_KEY (hex 64 chars).
 * Format    : "iv:authTag:ciphertext" encodé en base64, stocké tel quel en DB.
 *
 * Champs concernés dans SoftFacture :
 *   - Client.email, Client.phone (renseignements personnels des clients finaux)
 *   - User.phone (si présent)
 *
 * Rotation de clé : changer FIELD_ENCRYPTION_KEY_OLD + re-chiffrement via script dédié.
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12; // 96 bits — recommandé NIST SP 800-38D pour GCM
const TAG_BYTES = 16;

/**
 * Retourne la clé de chiffrement depuis l'environnement.
 * Lance une erreur au démarrage si absente (fail-fast).
 */
function getEncryptionKey(): Buffer {
  const hex = process.env.FIELD_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      '[fieldEncryption] FIELD_ENCRYPTION_KEY manquante ou invalide. ' +
        'Générez-la avec : openssl rand -hex 32'
    );
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Chiffre une valeur texte.
 * @returns Chaîne "iv:tag:ciphertext" en base64 URL-safe, ou null si input null.
 */
export function encryptField(plaintext: string | null | undefined): string | null {
  if (plaintext == null) return null;

  const key = getEncryptionKey();
  const iv = randomBytes(IV_BYTES);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Format compact : base64(iv):base64(tag):base64(ciphertext)
  return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
}

/**
 * Déchiffre une valeur chiffrée par encryptField().
 * @returns Texte en clair, ou null si ciphertext null.
 * @throws  Si le tag d'authentification est invalide (données altérées).
 */
export function decryptField(ciphertext: string | null | undefined): string | null {
  if (ciphertext == null) return null;

  // Valeur non chiffrée (migration progressive) — détection par absence de ":"
  if (!ciphertext.includes(':')) return ciphertext;

  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('[fieldEncryption] Format de ciphertext invalide.');
  }

  const [ivB64, tagB64, encB64] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');
  const encrypted = Buffer.from(encB64, 'base64');

  if (authTag.length !== TAG_BYTES) {
    throw new Error("[fieldEncryption] Tag d'authentification invalide.");
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Hash déterministe (SHA-256) d'une valeur — utilisé pour les recherches par email
 * sans déchiffrer tout le champ (compromis recherchabilité / confidentialité).
 * NE PAS utiliser pour stocker des mots de passe (utiliser bcrypt).
 */
export function hashForSearch(value: string): string {
  const salt = process.env.SEARCH_HASH_SALT ?? 'softfacture-ca-loi25';
  return createHash('sha256')
    .update(salt + value.toLowerCase().trim())
    .digest('hex');
}

/**
 * Anonymise de façon irréversible une valeur personnelle.
 * Utilisé lors de la purge post-résiliation (Loi 25 art. 28).
 * Retourne un hash non réversible préfixé pour indiquer l'anonymisation.
 */
export function anonymizeField(value: string | null | undefined): string {
  if (!value) return '[anonymisé]';
  const hash = createHash('sha256').update(value).digest('hex').slice(0, 16);
  return `[anonymisé-${hash}]`;
}
