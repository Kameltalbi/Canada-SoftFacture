import { Router } from 'express';
import { logger } from '../lib/logger.js';
import { getStripe } from '../lib/billing/stripeClient.js';
import { handleStripeWebhookEvent } from '../lib/billing/stripeWebhook.js';

const router = Router();

router.post('/stripe', async (req, res) => {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!stripe || !secret) {
    logger.warn('Stripe webhook reçu mais Stripe non configuré');
    return res.status(503).json({ error: 'Webhook non configuré' });
  }

  const signature = req.headers['stripe-signature'];
  if (!signature || typeof signature !== 'string') {
    return res.status(400).json({ error: 'Signature manquante' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, secret);
  } catch (err) {
    logger.warn({ err }, 'Stripe webhook : signature invalide');
    return res.status(400).json({ error: 'Signature webhook invalide' });
  }

  try {
    await handleStripeWebhookEvent(event);
    return res.json({ received: true });
  } catch (err) {
    logger.error({ err, type: event.type }, 'Erreur traitement webhook Stripe');
    return res.status(500).json({ error: 'Erreur traitement webhook' });
  }
});

export default router;
