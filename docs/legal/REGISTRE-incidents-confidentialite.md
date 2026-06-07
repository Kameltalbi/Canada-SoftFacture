# Registre Interne des Incidents de Confidentialité — Softfacture Canada

**Responsable du registre :** Omar Talbi  
**Courriel :** vieprivee@softfacture.ca  
**Référence légale :** Loi 25 du Québec, art. 3.5 — Règlement sur les incidents de confidentialité (RLRQ, c. P-39.1, r. 3.1)  
**Classification :** 🔒 Document INTERNE ET CONFIDENTIEL — Ne pas diffuser

> **Obligation légale :** Tout incident de confidentialité présentant un risque de préjudice sérieux doit être :
>
> - Consigné dans ce registre **sans délai** après détection ;
> - Notifié à la **Commission d'accès à l'information (CAI)** via le formulaire officiel sur cai.gouv.qc.ca ;
> - Notifié aux **personnes concernées** si un préjudice sérieux est confirmé.

---

## Registre des incidents

| #            | Date de détection | Heure | Description de la faille / Nature de l'incident                                                                                                                                                                                                                                                                                         | Cause probable                                          | Catégories de données touchées                                                  | Nombre d'individus affectés (estimé)             | Préjudice sérieux ? (Oui/Non + justification)                                                                                                                                                                                                                   | Mesures correctives immédiates                                                                                                                                                                                | Mesures correctives à long terme                                                                                                                                                   | Notification CAI (Date + N° de dossier)                                          | Notification personnes touchées (Date + Moyen) | Statut     | Notes / Suivi                                                                          |
| ------------ | ----------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------- | ---------- | -------------------------------------------------------------------------------------- |
| INC-2026-001 | 2026-06-01        | 14h32 | Accès technique non autorisé à la base de données de logs par un employé n'ayant pas les droits suffisants, suite à une erreur de configuration des rôles PostgreSQL lors d'une mise à jour de routine. L'employé a consulté par erreur des journaux d'audit contenant des adresses courriel de clients. Aucune exfiltration confirmée. | Erreur de configuration RBAC lors du déploiement v2.1.4 | Adresses courriel (journaux d'audit), sans données financières ni mots de passe | ~340 adresses courriel visibles en lecture seule | **Non — Préjudice sérieux écarté.** Accès interne limité à un seul employé autorisé à travailler sur l'infrastructure. Aucune copie ni exfiltration. Données déjà accessibles à cet employé dans le cadre normal de ses fonctions. Risque résiduel jugé faible. | 1. Révocation immédiate du rôle PostgreSQL erroné (14h45). 2. Audit complet des permissions dans les 2h. 3. Journalisation de l'accès dans le registre d'audit interne. 4. Entretien avec l'employé concerné. | 1. Revue complète de la procédure de déploiement (ajout étape de validation RBAC). 2. Automatisation des tests de permissions en CI/CD. 3. Formation équipe sur gestion des accès. | Non applicable (préjudice sérieux non retenu — conservation interne obligatoire) | Non applicable                                 | ✅ Clôturé | Incident clôturé le 2026-06-03 après audit complet. Aucune donnée exfiltrée confirmée. |

---

## Procédure de remplissage

### Étapes à suivre lors de la détection d'un incident

**Étape 1 — Détection et qualification (dans l'heure)**

1. Identifier la nature et l'étendue de l'incident
2. Attribuer un numéro d'incident : `INC-AAAA-NNN` (ex. INC-2026-002)
3. Remplir les colonnes 1 à 7 du registre

**Étape 2 — Évaluation du préjudice sérieux (dans les 24h)**
Évaluer le risque selon les critères de la CAI :

- Sensibilité des données concernées (financières, médicales, biométriques = risque élevé)
- Probabilité d'utilisation préjudiciable (usurpation d'identité, harcèlement, fraude)
- Nombre de personnes touchées
- Mesures de protection en place au moment de l'incident (données chiffrées = risque réduit)

**Étape 3 — Notification (si préjudice sérieux = OUI)**

- **CAI** : formulaire en ligne sur [cai.gouv.qc.ca](https://www.cai.gouv.qc.ca) — dans les meilleurs délais
- **Personnes touchées** : par courriel direct, avec description claire et recommandations
- **Clients Softfacture affectés** : notification sous 48h (conformément au DPA, Article 4)

**Étape 4 — Mesures correctives et clôture**

1. Documenter toutes les mesures prises
2. Effectuer une revue post-incident
3. Marquer le statut : `✅ Clôturé` ou `🔄 En cours`

---

## Grille d'évaluation du préjudice sérieux

| Critère                                     | Faible                        | Modéré                         | Élevé                               |
| ------------------------------------------- | ----------------------------- | ------------------------------ | ----------------------------------- |
| Type de données                             | Nom, courriel professionnel   | Adresse personnelle, téléphone | NAS, données financières, médicales |
| Données chiffrées au moment de l'incident ? | Oui (AES-256) → risque réduit | Partiellement                  | Non                                 |
| Accès externe ou interne ?                  | Interne, employé autorisé     | Interne, non autorisé          | Externe (tiers ou inconnu)          |
| Exfiltration confirmée ?                    | Non                           | Incertaine                     | Confirmée                           |
| Nombre de personnes                         | < 100                         | 100 – 10 000                   | > 10 000                            |

---

## Contacts d'urgence

| Rôle                                | Nom         | Courriel                   | Téléphone      |
| ----------------------------------- | ----------- | -------------------------- | -------------- |
| Responsable de la protection des RP | Omar Talbi  | vieprivee@softfacture.ca   | À compléter    |
| Direction générale                  | À compléter | À compléter                | À compléter    |
| Conseiller juridique externe        | À compléter | À compléter                | À compléter    |
| CAI — Signalement d'incident        | —           | https://www.cai.gouv.qc.ca | 1 888 528-7741 |

---

_Dernière mise à jour du registre : 7 juin 2026 — Omar Talbi_
