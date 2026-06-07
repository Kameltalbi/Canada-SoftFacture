# Évaluation des Facteurs Relatifs à la Vie Privée (EFVP)

# Softfacture Canada — Plateforme SaaS de facturation

**Référence légale :** Loi 25 du Québec, art. 3.3 — LPRPDE, principe 4.7.3  
**Responsable de l'évaluation :** Omar Talbi, Responsable de la protection des renseignements personnels  
**Date de l'évaluation :** 7 juin 2026  
**Version :** 1.0  
**Classification :** 🔒 Document INTERNE ET CONFIDENTIEL

---

## PARTIE 1 — Description du projet

### 1.1 Identification du projet

| Champ                        | Détail                                                   |
| ---------------------------- | -------------------------------------------------------- |
| **Nom du projet**            | Softfacture Canada — Plateforme SaaS de facturation B2B  |
| **Éditeur**                  | Nexiora Inc.                                             |
| **Type de projet**           | Logiciel en tant que service (SaaS) multi-tenant         |
| **Marché cible**             | Professionnels et PME du Québec et du Canada             |
| **Modèle d'affaires**        | Abonnement mensuel/annuel (plans Starter, Pro, Business) |
| **Date de lancement prévue** | À déterminer                                             |

### 1.2 Description fonctionnelle

Softfacture est une application web multi-tenant permettant à des entreprises (les « Clients ») de :

- Gérer leurs clients, produits et services
- Créer, envoyer et archiver des factures et soumissions en format PDF
- Gérer les paiements reçus et les abonnements récurrents
- Inviter des collaborateurs avec des niveaux d'accès différenciés (ADMIN / USER)
- Exporter leurs données financières

Chaque Client opère dans un espace entièrement isolé des autres (isolation multi-tenant). Softfacture agit à titre de mandataire (sous-traitant) pour les données saisies par le Client concernant ses propres clients.

### 1.3 Parties prenantes

| Rôle                      | Description                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------- |
| Responsable du traitement | Le Client professionnel (entreprise québécoise)                                         |
| Mandataire                | Nexiora Inc. / Softfacture Canada                                                       |
| Sous-traitants ultérieurs | Hébergeur Québec, Stripe (paiements), fournisseur SMTP                                  |
| Personnes concernées      | Clients du Client saisis dans la Plateforme ; Administrateurs et utilisateurs du compte |
| Autorité de contrôle      | Commission d'accès à l'information du Québec (CAI)                                      |

---

## PARTIE 2 — Cartographie du flux de données

### 2.1 Schéma du cycle de vie des données

```
[Personne concernée]
        │
        ▼
[Collecte par le Client]
  • Nom, prénom du client
  • Adresse courriel (chiffrée AES-256-GCM au repos)
  • Téléphone (chiffré AES-256-GCM au repos)
  • Adresse postale
  • Détail des prestations / montants
        │
        ▼
[Saisie dans Softfacture — Transmission chiffrée HTTPS/TLS]
        │
        ▼
[Stockage — Serveur PostgreSQL hébergé au Québec]
  • Isolation par tenant (Row-Level Security)
  • Chiffrement AES-256-GCM des champs sensibles
  • Journalisation dans le registre d'audit immuable
        │
        ├──────────────────────────────────────┐
        ▼                                      ▼
[Traitement métier]                   [Sous-traitants ponctuels]
  • Génération PDF facture/soumission    • Stripe : paiements abonnement
  • Envoi par courriel au client final   • SMTP : envoi courriels transact.
  • Archivage                            • Hébergeur : stockage physique QC
        │
        ▼
[Fin du contrat — Résiliation]
        │
        ▼
[Période de grâce 90 jours]
  • Données accessibles pour export
  • Endpoint GET /api/privacy/export (JSON/CSV)
        │
        ▼
[Destruction / Anonymisation irréversible]
  • Données personnelles : SUPPRESSION DÉFINITIVE (hard delete)
  • Données financières résiduelles : ANONYMISATION (noms → [ANONYMISÉ],
    courriels → hash irréversible, conservation des montants pour obligations fiscales)
```

### 2.2 Catégories de données et base légale

| Catégorie                 | Données concernées                         | Base légale                          | Conservation            |
| ------------------------- | ------------------------------------------ | ------------------------------------ | ----------------------- |
| Compte utilisateur        | Nom, courriel, rôle                        | Exécution du contrat                 | Durée abonnement + 90 j |
| Données clients du Client | Nom, courriel, téléphone, adresse          | Exécution du contrat (mandataire)    | Durée abonnement + 90 j |
| Données financières       | Montants, taxes, dates, numéros de facture | Obligation légale (LIR art. 230)     | 7 ans minimum           |
| Journaux techniques       | IP, horodatages, actions                   | Intérêt légitime (sécurité)          | 12 mois                 |
| Registre d'audit          | Événements d'accès, hash chaîné            | Obligation légale (Loi 25 art. 63.1) | 5 ans                   |

---

## PARTIE 3 — Grille d'analyse des risques

### 3.1 Méthodologie

Chaque risque est évalué selon deux axes :

- **Probabilité** : Faible (1) / Moyenne (2) / Élevée (3)
- **Impact** : Faible (1) / Modéré (2) / Grave (3)
- **Score de risque résiduel** = Probabilité × Impact (après mesures)

### 3.2 Tableau des risques

| #    | Risque identifié                                               | Probabilité brute | Impact brut | Mesures de sécurité en place                                                               | Probabilité résiduelle | Impact résiduel | Score résiduel | Niveau         |
| ---- | -------------------------------------------------------------- | ----------------- | ----------- | ------------------------------------------------------------------------------------------ | ---------------------- | --------------- | -------------- | -------------- |
| R-01 | Accès non autorisé aux données d'un tenant par un autre tenant | 2                 | 3           | Row-Level Security PostgreSQL ; isolation applicative ; JWT par tenant                     | 1                      | 3               | **3**          | 🟢 Faible      |
| R-02 | Vol ou fuite de la base de données (attaque externe)           | 2                 | 3           | Chiffrement AES-256-GCM au repos ; pare-feu serveur ; accès restreints                     | 1                      | 2               | **2**          | 🟢 Faible      |
| R-03 | Interception des données en transit                            | 1                 | 3           | TLS 1.2+ obligatoire (HTTPS) ; HSTS en production                                          | 1                      | 1               | **1**          | 🟢 Très faible |
| R-04 | Accès interne abusif par un employé de Softfacture             | 2                 | 2           | RBAC strict ; journaux d'audit immuables (SHA-256) ; politique de confidentialité employés | 1                      | 2               | **2**          | 🟢 Faible      |
| R-05 | Perte ou indisponibilité des données (sinistre)                | 1                 | 3           | Sauvegardes quotidiennes hébergées au Québec ; plan de reprise d'activité                  | 1                      | 2               | **2**          | 🟢 Faible      |
| R-06 | Incident chez un sous-traitant (ex. Stripe, SMTP)              | 2                 | 2           | Contrats DPA avec sous-traitants ; données paiement non stockées en clair                  | 1                      | 2               | **2**          | 🟢 Faible      |
| R-07 | Non-respect du droit à l'effacement (purge incomplète)         | 1                 | 3           | Cron quotidien de purge automatique (purgeScheduler) ; anonymisation irréversible testée   | 1                      | 1               | **1**          | 🟢 Très faible |
| R-08 | Usurpation d'identité (compromission de compte)                | 2                 | 3           | Hachage bcrypt des mots de passe ; tokens JWT à durée limitée ; reset sécurisé             | 1                      | 2               | **2**          | 🟢 Faible      |
| R-09 | Transfert non autorisé hors Québec                             | 1                 | 3           | Hébergement garanti au Québec ; DPA avec sous-traitants ; clauses art. 17 Loi 25           | 1                      | 1               | **1**          | 🟢 Très faible |
| R-10 | Absence de notification en cas d'incident                      | 1                 | 3           | Processus documenté (48h) ; registre des incidents ; procédure CAI                         | 1                      | 1               | **1**          | 🟢 Très faible |

### 3.3 Légende des niveaux de risque résiduel

| Score | Niveau                  | Action requise                                |
| ----- | ----------------------- | --------------------------------------------- |
| 1–2   | 🟢 Faible / Très faible | Surveillance continue — aucune action urgente |
| 3–4   | 🟡 Modéré               | Plan d'amélioration à 6 mois                  |
| 6–9   | 🔴 Élevé                | Action correctrice immédiate requise          |

---

## PARTIE 4 — Mesures de conformité déployées

| Mesure                                           | Statut        | Référence technique                                |
| ------------------------------------------------ | ------------- | -------------------------------------------------- |
| Chiffrement AES-256-GCM des champs sensibles     | ✅ Implémenté | `backend/src/lib/privacy/fieldEncryption.ts`       |
| Row-Level Security PostgreSQL (isolation tenant) | ✅ Implémenté | `backend/src/lib/privacy/tenantIsolation.ts`       |
| Registre d'audit immuable (chaîne SHA-256)       | ✅ Implémenté | `backend/src/lib/privacy/auditLogger.ts`           |
| Export portabilité données (JSON/CSV)            | ✅ Implémenté | `backend/src/lib/privacy/dataExport.ts`            |
| Purge/anonymisation automatique (cron 90 jours)  | ✅ Implémenté | `backend/src/lib/privacy/lifecyclePurge.ts`        |
| API conformité Loi 25 (export, audit, incidents) | ✅ Implémenté | `backend/src/routes/privacy.routes.ts`             |
| Politique de confidentialité publique            | ✅ Publiée    | `/politique-de-confidentialite`                    |
| DPA intégré aux CGU                              | ✅ Rédigé     | `docs/legal/DPA-accord-traitement-donnees.md`      |
| Registre des incidents                           | ✅ Créé       | `docs/legal/REGISTRE-incidents-confidentialite.md` |
| Bandeau consentement cookies                     | ✅ Implémenté | `src/components/cookie-consent-banner.tsx`         |
| Emails bilingues FR/EN                           | ✅ Implémenté | `backend/src/services/email.ts`                    |

---

## PARTIE 5 — Conclusion et décision de conformité

### 5.1 Synthèse de l'évaluation

L'évaluation des facteurs relatifs à la vie privée menée sur la Plateforme Softfacture Canada démontre que :

1. **Les risques résiduels sont globalement faibles** grâce aux mesures de sécurité techniques déployées (chiffrement bout-en-bout, isolation multi-tenant, audit immuable).

2. **Le cycle de vie des données est entièrement maîtrisé**, de la collecte à la destruction/anonymisation, avec des délais conformes aux obligations de la Loi 25 et de la LIR fédérale.

3. **La souveraineté des données est garantie** par un hébergement physique au Québec et des clauses contractuelles avec l'ensemble des sous-traitants.

4. **Les droits des personnes concernées sont respectés** : accès, rectification, portabilité et droit à l'effacement sont techniquement implémentés et accessibles.

### 5.2 Recommandations pour la mise en production

1. Compléter les informations légales (`NEQ`, `BN`, `TPS`, `TVQ`) dans les variables d'environnement.
2. Documenter formellement l'hébergeur retenu (nom, adresse physique au Québec, contrat DPA avec lui).
3. Effectuer une revue annuelle de la présente EFVP (prochaine révision : **juin 2027**).
4. Former tout nouveau membre du personnel ayant accès aux données sur les obligations Loi 25.

### 5.3 Décision

> Après examen complet des risques, des mesures en place et du cadre légal applicable, je soussigné(e) confirme que la Plateforme Softfacture Canada est **en état de conformité substantielle** avec la _Loi modernisant des dispositions législatives en matière de protection des renseignements personnels_ (Loi 25 du Québec) et la _LPRPDE_, sous réserve de la complétion des éléments de mise en production identifiés dans le présent rapport.

**Signé à Montréal, le 7 juin 2026**

```
___________________________________
Omar Talbi
Responsable de la protection des renseignements personnels
Nexiora Inc. — Softfacture Canada
vieprivee@softfacture.ca
```

---

_Prochaine révision prévue : juin 2027 ou lors de tout changement majeur du système._
