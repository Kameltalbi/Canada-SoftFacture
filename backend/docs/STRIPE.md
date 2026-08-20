# Intégration Stripe — SoftFacture Canada

## Prix avant taxes (CAD) = page Tarifs

Les montants affichés sur **`/tarifs`** sont **avant taxes, en CAD** :

| Offre     | Avant taxes / mois | Annuel (10 mois facturés) |
| --------- | ------------------ | ------------------------- |
| Gratuit   | 0 $                | —                         |
| Essentiel | 34,90 $ CAD        | 349,00 $ CAD              |
| Business  | 59,90 $ CAD        | 599,00 $ CAD              |

Fichiers à synchroniser :

- `src/lib/pricing-plans.ts` → `PLAN_PRICES_HT_CAD`
- `backend/src/lib/billing/plans.ts` → `PLAN_PRICE_HT_CAD`

Le **plan Gratuit** n’est pas envoyé à Stripe (inscription directe).

Stripe Checkout **embarqué** affiche le formulaire de paiement sur `/checkout` (`ui_mode: embedded`). Après paiement, l’utilisateur est renvoyé vers `/checkout/success?session_id={CHECKOUT_SESSION_ID}`.

Sans `STRIPE_PUBLISHABLE_KEY`, le backend bascule en Checkout hébergé (redirection vers Stripe). Sans `STRIPE_SECRET_KEY`, le checkout renvoie une erreur (aucun essai payant n’est activé).

## Configuration

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:3000
STRIPE_AUTOMATIC_TAX=true
```

Price IDs optionnels (sinon `price_data` CAD est créé à la volée) :

```env
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_BUSINESS=price_...
STRIPE_PRICE_BUSINESS_YEARLY=price_...
```

Créer les produits/prix CAD depuis le backend :

```bash
cd backend
npx tsx scripts/create-stripe-prices.ts
```

Copier les `STRIPE_PRICE_*` affichés dans `backend/.env`.

## Webhook

```text
POST /api/billing/webhooks/stripe
```

Événements : `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed`.

Local : `stripe listen --forward-to localhost:4000/api/billing/webhooks/stripe`

## Désactiver Stripe Tax

Si Stripe Tax n’est pas configuré, `STRIPE_AUTOMATIC_TAX=false` : seul le montant avant taxes est facturé (à éviter en production — activer Stripe Tax Canada).
