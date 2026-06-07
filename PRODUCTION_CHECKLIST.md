# ✅ Todo Liste — Mise en production SoftFacture Canada

> Document de référence à compléter avant tout déploiement.
> Créé le : 7 juin 2026 | Statut : **EN DÉVELOPPEMENT LOCAL**

---

## 🗄️ 1. Infrastructure & Hébergement

- [ ] Choisir un hébergeur **physiquement au Québec** (obligation Loi 25 art. 17)
  - Options recommandées : OVHcloud Beauharnois QC, Aptum Montréal, AWS ca-central-1 (Montréal)
- [ ] Provisionner le serveur PostgreSQL (version ≥ 15)
- [ ] Provisionner le serveur Node.js (version ≥ 20 LTS)
- [ ] Configurer les **sauvegardes automatiques** de la base de données (rétention 30 jours minimum)
- [ ] Activer **HTTPS/TLS** (Let's Encrypt ou certificat OV/EV)
- [ ] Configurer un **reverse proxy** (Nginx ou Caddy) devant l'app Node
- [ ] Ouvrir uniquement les ports 80, 443 (fermer 4000, 5432, etc.)
- [ ] Mettre en place un **pare-feu** (UFW ou équivalent cloud)

---

## 🔐 2. Variables d'environnement — Backend (`backend/.env`)

Toutes les valeurs marquées ⚠️ sont **bloquantes** en production.

| Variable                | Action requise                                                                                     |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | ⚠️ URL PostgreSQL de prod (SSL obligatoire : `?sslmode=require`)                                   |
| `JWT_SECRET`            | ⚠️ Générer : `openssl rand -hex 64` (min 64 chars)                                                 |
| `FIELD_ENCRYPTION_KEY`  | ⚠️ Générer : `openssl rand -hex 32` — **stocker dans un coffre-fort (Vault, AWS Secrets Manager)** |
| `SEARCH_HASH_SALT`      | ⚠️ Générer : `openssl rand -hex 24` — ne jamais changer après la mise en prod                      |
| `CORS_ORIGIN`           | ⚠️ Remplacer par l'URL de prod ex. `https://app.softfacture.ca`                                    |
| `FRONTEND_URL`          | ⚠️ URL de prod ex. `https://app.softfacture.ca`                                                    |
| `PORT`                  | `4000` ou adapter selon le reverse proxy                                                           |
| `NODE_ENV`              | ⚠️ Définir à `production`                                                                          |
| `SMTP_HOST`             | ⚠️ Serveur SMTP de prod (ex. Postmark, Mailgun, Amazon SES)                                        |
| `SMTP_PORT`             | `587` (STARTTLS) ou `465` (SSL)                                                                    |
| `SMTP_SECURE`           | `true` si port 465                                                                                 |
| `SMTP_USER`             | Identifiant SMTP                                                                                   |
| `SMTP_PASS`             | Mot de passe SMTP                                                                                  |
| `SMTP_FROM`             | `SoftFacture Canada <no-reply@softfacture.ca>`                                                     |
| `STRIPE_SECRET_KEY`     | ⚠️ Clé **live** Stripe (pas la clé test)                                                           |
| `STRIPE_WEBHOOK_SECRET` | ⚠️ Secret du webhook Stripe live                                                                   |
| `STRIPE_PRICE_STARTER`  | Price ID Stripe live — plan Starter CAD                                                            |
| `STRIPE_PRICE_PRO`      | Price ID Stripe live — plan Pro CAD                                                                |
| `STRIPE_PRICE_BUSINESS` | Price ID Stripe live — plan Business CAD                                                           |
| `STRIPE_AUTOMATIC_TAX`  | `true` (TPS/TVQ calculées par Stripe Tax)                                                          |
| `TUNTRUST_*`            | Optionnel — si signatures électroniques activées                                                   |

---

## 🌐 3. Variables d'environnement — Frontend (`/.env.production`)

| Variable                           | Valeur de prod                                                    |
| ---------------------------------- | ----------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`              | ⚠️ `https://api.softfacture.ca/api` (ou sous-chemin selon config) |
| `NEXT_PUBLIC_SHOW_LOCALE_SWITCHER` | `true`                                                            |
| `NEXT_PUBLIC_FEATURES_EINVOICE`    | Laisser absent ou `false`                                         |
| `NEXT_PUBLIC_LEGAL_BRAND`          | `SoftFacture Canada`                                              |
| `NEXT_PUBLIC_LEGAL_COMPANY_NAME`   | Nom légal complet de la société                                   |
| `NEXT_PUBLIC_LEGAL_LEGAL_FORM`     | `Inc.` ou forme juridique réelle                                  |
| `NEXT_PUBLIC_LEGAL_ADDRESS_LINE1`  | Adresse du siège social réelle                                    |
| `NEXT_PUBLIC_LEGAL_ADDRESS_LINE2`  | Code postal + ville                                               |
| `NEXT_PUBLIC_LEGAL_NEQ`            | ⚠️ Numéro d'entreprise du Québec (10 chiffres)                    |
| `NEXT_PUBLIC_LEGAL_BN`             | ⚠️ Business Number fédéral (9 chiffres)                           |
| `NEXT_PUBLIC_LEGAL_TPS`            | ⚠️ Numéro TPS                                                     |
| `NEXT_PUBLIC_LEGAL_TVQ`            | ⚠️ Numéro TVQ                                                     |
| `NEXT_PUBLIC_LEGAL_DIRECTOR`       | Nom du responsable de la publication                              |
| `NEXT_PUBLIC_LEGAL_EMAIL`          | `contact@softfacture.ca`                                          |
| `NEXT_PUBLIC_LEGAL_DPO_NAME`       | `Omar Talbi` (ou nom réel du responsable Loi 25)                  |
| `NEXT_PUBLIC_LEGAL_DPO_EMAIL`      | `vieprivee@softfacture.ca`                                        |
| `NEXT_PUBLIC_LEGAL_HOST_NAME`      | Nom de l'hébergeur (ex. OVHcloud)                                 |
| `NEXT_PUBLIC_LEGAL_HOST_ADDRESS`   | Adresse physique de l'hébergeur                                   |

---

## 🗃️ 4. Base de données

- [ ] Exécuter les migrations Prisma en prod :
  ```bash
  cd backend
  npx prisma migrate deploy
  ```
- [ ] **Migration Loi 25** (tables `DataAccessLog`, `OrganizationDeletionRequest`, `PrivacyIncident`) :
  ```bash
  npx prisma migrate dev --name loi25-privacy-tables
  # puis en prod :
  npx prisma migrate deploy
  ```
- [ ] Activer les **Row Level Security (RLS)** PostgreSQL (script dans `backend/src/lib/privacy/tenantIsolation.ts`)
- [ ] Vérifier que l'utilisateur PostgreSQL de prod n'a **pas** les droits superuser
- [ ] Tester la connexion SSL : `DATABASE_URL=...?sslmode=require`

---

## 💳 5. Stripe — Configuration live

- [ ] Créer les **Price IDs live** en CAD (Starter, Pro, Business) dans le dashboard Stripe
- [ ] Activer **Stripe Tax** sur le compte pour TPS/TVQ automatique
- [ ] Enregistrer le webhook Stripe live pointant vers `https://api.softfacture.ca/api/billing/webhooks/stripe`
- [ ] Tester un paiement complet en mode live avec une vraie carte test
- [ ] Vérifier que les reçus Stripe affichent **SoftFacture Canada** et les numéros TPS/TVQ

---

## 📧 6. Emails transactionnels

- [ ] Configurer le domaine d'envoi (`softfacture.ca`) chez le fournisseur SMTP
- [ ] Ajouter les enregistrements DNS : **SPF**, **DKIM**, **DMARC**
- [ ] Tester l'envoi de chaque email :
  - [ ] Invitation utilisateur (FR + EN)
  - [ ] Réinitialisation mot de passe (FR + EN)
  - [ ] Envoi de facture au client (FR + EN)
  - [ ] Envoi de soumission au client (FR + EN)
- [ ] Vérifier que l'adresse d'expéditeur est `no-reply@softfacture.ca` (ou similaire)

---

## 🔒 7. Sécurité

- [ ] Activer **HSTS** dans le reverse proxy (Strict-Transport-Security)
- [ ] Headers de sécurité HTTP : `X-Frame-Options`, `X-Content-Type-Options`, `CSP`
- [ ] Rate limiting sur les routes sensibles (`/api/auth/login`, `/api/auth/forgot-password`)
- [ ] Scanner de vulnérabilités (ex. `npm audit` sans vulnérabilités critiques)
- [ ] Désactiver les routes de debug / `/api/docs` en production si non nécessaires
- [ ] Activer les logs de production (niveau `warn` et `error` au minimum)
- [ ] Configurer un système d'alerte (ex. Sentry, Betterstack, Datadog)

---

## 🇨🇦 8. Conformité Loi 25 / PIPEDA

- [ ] Générer et stocker `FIELD_ENCRYPTION_KEY` dans un gestionnaire de secrets sécurisé
- [ ] Vérifier que `SEARCH_HASH_SALT` est unique et ne sera **jamais modifié** après la mise en prod
- [ ] Confirmer que les données sont hébergées **physiquement au Québec** (documentation de l'hébergeur)
- [ ] Créer l'adresse courriel `vieprivee@softfacture.ca` et la rediriger vers le responsable
- [ ] Tester le endpoint `GET /api/privacy/export` (export des données client)
- [ ] Tester le endpoint `POST /api/privacy/deletion-request` (demande de suppression)
- [ ] Tester le endpoint `GET /api/privacy/audit-logs` (registre audit CAI)
- [ ] Vérifier que le cron de purge (`purgeScheduler`) s'exécute correctement à 02:00
- [ ] Déposer le registre des activités de traitement auprès de la CAI si requis

---

## 🌍 9. DNS & Domaine

- [ ] Pointer le domaine `softfacture.ca` vers le serveur frontend
- [ ] Pointer `api.softfacture.ca` (ou sous-chemin) vers le serveur backend
- [ ] Créer `vieprivee@softfacture.ca` (courriel Loi 25)
- [ ] Créer `support@softfacture.ca`
- [ ] Créer `no-reply@softfacture.ca` (expéditeur emails)
- [ ] Vérifier la propagation DNS (TTL, CAA records pour TLS)

---

## 🧪 10. Tests avant lancement

- [ ] Test complet du tunnel d'inscription → onboarding → création facture → envoi PDF
- [ ] Test du tunnel Stripe live (abonnement + webhook)
- [ ] Test du reset de mot de passe (lien reçu par courriel)
- [ ] Test de l'invitation d'un collaborateur
- [ ] Test de l'export de données (Loi 25)
- [ ] Test du switcher FR / EN sur le site et dans l'application
- [ ] Test d'affichage du PDF avec TPS/TVQ (fr-CA)
- [ ] Test sur mobile (responsive)
- [ ] Test des pages légales : Politique de confidentialité, CGV, Mentions légales
- [ ] Test du bandeau cookies

---

## 🚀 11. Commandes de déploiement

```bash
# Backend
cd backend
npm ci --production
npx prisma migrate deploy
npm run build
pm2 start dist/server.js --name softfacture-api

# Frontend
cd ..
npm ci
npm run build
# Démarrer avec PM2 ou serveur statique selon l'hébergement
pm2 start npm --name softfacture-web -- start
```

---

## 📋 Récapitulatif des points bloquants avant go-live

| #   | Élément                                          | Critique |
| --- | ------------------------------------------------ | -------- |
| 1   | Hébergement physique au Québec documenté         | ✅ Oui   |
| 2   | `FIELD_ENCRYPTION_KEY` générée et dans un coffre | ✅ Oui   |
| 3   | `JWT_SECRET` ≥ 64 chars en production            | ✅ Oui   |
| 4   | Migrations Prisma `migrate deploy` exécutées     | ✅ Oui   |
| 5   | Stripe live configuré avec TPS/TVQ               | ✅ Oui   |
| 6   | HTTPS/TLS activé                                 | ✅ Oui   |
| 7   | DNS SPF/DKIM/DMARC configurés                    | ✅ Oui   |
| 8   | Adresse `vieprivee@softfacture.ca` fonctionnelle | ✅ Oui   |
| 9   | NEQ, BN, TPS, TVQ renseignés dans les variables  | ✅ Oui   |
| 10  | Tests end-to-end validés                         | ✅ Oui   |
