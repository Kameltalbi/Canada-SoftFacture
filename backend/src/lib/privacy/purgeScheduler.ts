/**
 * Scheduler de purge Loi 25 — art. 28 LPRPDE / Loi 25 Québec.
 *
 * Exécute runLifecyclePurgeJob() quotidiennement à 02:00 heure locale (Montréal).
 *
 * Utilise setInterval natif Node.js (pas de dépendance externe).
 * En production, préférer un cron système (crontab, AWS EventBridge, Cloud Scheduler)
 * ou un job runner (BullMQ, pg-boss) pour la fiabilité multi-instance.
 *
 * Usage : appeler startPurgeScheduler() dans server.ts après démarrage HTTP.
 */

import { runLifecyclePurgeJob } from './lifecyclePurge.js';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * Calcule le délai en ms avant la prochaine exécution à targetHour:00 heure locale.
 */
function msUntilNextRun(targetHour = 2): number {
  const now = new Date();
  const next = new Date();
  next.setHours(targetHour, 0, 0, 0);

  if (next <= now) {
    // Déjà passé aujourd'hui → demain
    next.setDate(next.getDate() + 1);
  }

  return next.getTime() - now.getTime();
}

/**
 * Démarre le scheduler de purge.
 * @param runImmediately - Si true, exécute immédiatement en plus du schedule quotidien.
 *                         Utile pour forcer une passe au démarrage en dev/test.
 */
export function startPurgeScheduler(runImmediately = false): void {
  if (runImmediately) {
    void runLifecyclePurgeJob().catch((err) =>
      console.error('[purgeScheduler] Erreur passage immédiat:', err)
    );
  }

  // Première exécution : attendre l'heure cible
  const initialDelay = msUntilNextRun(2);
  console.log(
    `[purgeScheduler] Première purge dans ${Math.round(initialDelay / 3600000)}h ` +
      `(cible 02:00 heure locale).`
  );

  setTimeout(() => {
    // Exécution quotidienne via setInterval
    void runLifecyclePurgeJob().catch((err) =>
      console.error('[purgeScheduler] Erreur purge quotidienne:', err)
    );

    setInterval(() => {
      void runLifecyclePurgeJob().catch((err) =>
        console.error('[purgeScheduler] Erreur purge quotidienne:', err)
      );
    }, TWENTY_FOUR_HOURS_MS);
  }, initialDelay);
}
