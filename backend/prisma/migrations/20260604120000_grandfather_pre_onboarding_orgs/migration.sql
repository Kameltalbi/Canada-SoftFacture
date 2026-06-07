-- Comptes créés avant l'onboarding obligatoire : ne pas les bloquer.
-- Cette migration s'exécute une seule fois au déploiement : les orgs créées ensuite
-- gardent onboardingCompletedAt NULL jusqu'à finalisation de l'assistant.
UPDATE "Organization"
SET
  "onboardingCompletedAt" = COALESCE("createdAt", NOW()),
  "billingStatus" = CASE
    WHEN "billingStatus" = 'NONE' THEN 'TRIAL'::"BillingStatus"
    ELSE "billingStatus"
  END,
  "trialEndsAt" = CASE
    WHEN "trialEndsAt" IS NULL AND "billingStatus" = 'NONE' THEN NOW() + INTERVAL '30 days'
    ELSE "trialEndsAt"
  END
WHERE "onboardingCompletedAt" IS NULL;
