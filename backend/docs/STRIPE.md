# Intégration Stripe — SoftFacture

## Prix HT = page Tarifs

Les montants affichés sur **`/tarifs`** sont **hors taxes (HT)** :

| Offre    | HT / mois |
| -------- | --------- |
| Starter  | 5,90 €    |
| Pro      | 9,90 €    |
| Business | 12,90 €   |

Fichiers à synchroniser :

- `src/lib/pricing-plans.ts` → `PLAN_PRICES_HT_EUR`
- `backend/src/lib/billing/plans.ts` → `PLAN_PRICE_HT_EUR`

Stripe Checkout envoie le **montant HT** ; la **TVA (20 %)** est ajoutée au paiement si `STRIPE_AUTOMATIC_TAX=true` (recommandé, nécessite **Stripe Tax** activé).

## Configuration

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:3000
STRIPE_AUTOMATIC_TAX=true
```

`STRIPE_PRICE_*` : optionnel (Price ID Dashboard à la place de `price_data`).

## Webhook

```text
POST /api/billing/webhooks/stripe
```

Événements : `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed`.

Local : `stripe listen --forward-to localhost:4000/api/billing/webhooks/stripe`

## Désactiver Stripe Tax

Si Stripe Tax n’est pas configuré sur le compte, mettre `STRIPE_AUTOMATIC_TAX=false` : seul le montant HT sera facturé (à éviter en production — préférer activer Stripe Tax).
