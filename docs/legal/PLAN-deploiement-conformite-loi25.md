# Plan de Placement et de Déploiement — Conformité Loi 25

# Softfacture Canada

**Responsable :** Omar Talbi — vieprivee@softfacture.ca  
**Date :** 7 juin 2026  
**Classification :** 🔒 Document INTERNE

---

## Section 4 — Plan de déploiement des documents de conformité

### Tableau de synthèse

| Document                                      | Statut d'accès                                                                                                                                       | Emplacement technique                                                                                                                                                        | Action en cas de contrôle CAI                                                                                                                                      |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Politique de confidentialité**              | 🌐 **Public** — accessible sans authentification                                                                                                     | Page web : `/politique-de-confidentialite` + lien dans le footer de toutes les pages (marketing et app)                                                                      | Fournir l'URL publique et la date de dernière mise à jour. La CAI peut accéder directement en ligne.                                                               |
| **CGU / CGV avec DPA intégré**                | 🌐 **Public** — accessible sans authentification + ✅ **Acceptation obligatoire** à l'inscription (case à cocher avec horodatage enregistré en base) | Page web : `/cgv` + enregistrement en base de données : table `User.termsAcceptedAt`                                                                                         | Exporter depuis la base les horodatages d'acceptation pour les comptes concernés. Fournir le texte intégral en vigueur à la date de l'incident ou du contrôle.     |
| **Registre des incidents de confidentialité** | 🔒 **Interne et confidentiel** — jamais publié                                                                                                       | Dépôt Git privé de l'entreprise : `docs/legal/REGISTRE-incidents-confidentialite.md` + copie de travail dans un espace sécurisé (ex. Google Workspace chiffré, Notion privé) | Produire le registre complet sur demande écrite de la CAI. Omar Talbi doit pouvoir le transmettre dans les 10 jours ouvrables. Tenir à jour après chaque incident. |
| **Rapport EFVP**                              | 🔒 **Interne et confidentiel** — jamais publié                                                                                                       | Dépôt Git privé de l'entreprise : `docs/legal/EFVP-evaluation-facteurs-vie-privee.md`                                                                                        | Produire le rapport signé sur demande de la CAI. Mettre à jour avant de le transmettre si des changements significatifs ont eu lieu depuis la dernière révision.   |
| **DPA (Accord de traitement des données)**    | ✅ **Privé — contractuel** : intégré aux CGU acceptées à l'inscription                                                                               | Texte intégré à la page `/cgv` (ou lien dans les CGU vers l'annexe DPA publiée) + archivé dans `docs/legal/DPA-accord-traitement-donnees.md`                                 | Fournir le texte du DPA en vigueur à la date concernée et les preuves d'acceptation horodatées des clients.                                                        |
| **Politique interne de gestion des accès**    | 🔒 **Interne**                                                                                                                                       | À créer dans `docs/legal/` si non existante                                                                                                                                  | Démontrer le RBAC, les journaux d'audit et les politiques de gestion des employés ayant accès aux données.                                                         |

---

## Détail par document

### 1. Politique de confidentialité

```
Statut      : PUBLIC
URL         : https://app.softfacture.ca/politique-de-confidentialite
Footer      : Lien "Politique de confidentialité" dans TOUS les footers
              (marketing + application connectée)
Fichier src : src/components/legal/politique-confidentialite-content.tsx
Mise à jour : Modifier le composant + changer LEGAL_SITE.lastUpdated
              + notifier les utilisateurs actifs par courriel si changement majeur
```

**Checklist avant mise en production :**

- [ ] Vérifier que le nom du responsable (Omar Talbi) et le courriel (vieprivee@softfacture.ca) sont corrects
- [ ] Compléter `NEXT_PUBLIC_LEGAL_DPO_NAME` et `NEXT_PUBLIC_LEGAL_DPO_EMAIL` dans `.env.production`
- [ ] Vérifier que le lien apparaît bien dans le footer de la page marketing ET dans l'app connectée
- [ ] Vérifier la date de mise à jour (`LEGAL_SITE.lastUpdated`)

---

### 2. CGU / CGV avec DPA intégré

```
Statut      : PUBLIC + ACCEPTATION OBLIGATOIRE À L'INSCRIPTION
URL         : https://app.softfacture.ca/cgv
Intégration : Lors de l'inscription, afficher :
              ☐ J'ai lu et j'accepte les CGU, la Politique de confidentialité
                et l'Accord de traitement des données (DPA).
              → Enregistrer : User.termsAcceptedAt = timestamp, User.termsVersion = "v1.0-2026-06"
Fichier src : src/components/legal/cgv-content.tsx (à compléter avec le DPA)
              docs/legal/DPA-accord-traitement-donnees.md (version de référence)
```

**Checklist avant mise en production :**

- [ ] Intégrer le texte du DPA (Accord de Traitement des Données) dans la page `/cgv` ou en annexe liée
- [ ] Vérifier que le formulaire d'inscription enregistre `termsAcceptedAt` en base de données
- [ ] Vérifier que la version des CGU acceptée est enregistrée (`termsVersion`)
- [ ] Prévoir une re-confirmation si les CGU changent de manière substantielle

---

### 3. Registre des incidents de confidentialité

```
Statut      : INTERNE ET CONFIDENTIEL — ne jamais publier
Emplacement : docs/legal/REGISTRE-incidents-confidentialite.md (dépôt Git privé)
              + Copie de travail active dans espace sécurisé accessible à Omar Talbi
Responsable : Omar Talbi (seul responsable de la mise à jour)
Fréquence   : Mise à jour immédiate après chaque incident détecté
```

**Procédure en cas de contrôle CAI :**

1. Extraire la version actuelle du registre
2. S'assurer que tous les incidents depuis le dernier contrôle sont documentés
3. Transmettre par voie sécurisée (courriel chiffré ou portail CAI) dans les délais requis
4. Conserver une copie de la transmission

**Checklist :**

- [ ] Créer l'espace de travail sécurisé pour Omar Talbi (ex. dossier chiffré, Notion privé)
- [ ] Définir une procédure d'alerte interne pour que l'équipe technique notifie Omar Talbi sous 2h en cas d'incident détecté
- [ ] Ajouter le registre à l'ordre du jour des revues trimestrielles de sécurité

---

### 4. Rapport EFVP

```
Statut      : INTERNE ET CONFIDENTIEL — ne jamais publier
Emplacement : docs/legal/EFVP-evaluation-facteurs-vie-privee.md (dépôt Git privé)
Responsable : Omar Talbi (signataire et responsable de la révision)
Révision    : Annuelle (juin de chaque année) ou lors de tout changement majeur
              du système (nouvelle fonctionnalité traitant des données personnelles,
              nouvel hébergeur, nouveau sous-traitant)
```

**Procédure en cas de contrôle CAI :**

1. Vérifier que le rapport est à jour (date de révision, liste des mesures)
2. Mettre à jour si nécessaire et obtenir une nouvelle signature
3. Transmettre sur demande écrite de la CAI dans les 10 jours ouvrables
4. La CAI peut demander des preuves techniques complémentaires (logs, configuration RLS, etc.)

**Checklist :**

- [ ] Signer physiquement ou numériquement le rapport EFVP avant la mise en production
- [ ] Planifier la révision annuelle (rappel agenda : juin 2027)
- [ ] Mettre à jour la section 4 (mesures déployées) si de nouvelles fonctionnalités sont ajoutées

---

## Tableau de bord de conformité — Vue d'ensemble

| Obligation Loi 25                             | Article         | Mesure déployée                               | Statut          |
| --------------------------------------------- | --------------- | --------------------------------------------- | --------------- |
| Politique de confidentialité publiée          | Art. 3.2        | Page publique `/politique-de-confidentialite` | ✅              |
| Désignation d'un responsable de la protection | Art. 3.1        | Omar Talbi désigné, courriel dédié            | ✅              |
| DPA / Accord mandataire signé                 | Art. 18.1       | DPA intégré aux CGU (acceptation horodatée)   | ✅ (à déployer) |
| Registre des incidents                        | Art. 3.5        | `REGISTRE-incidents-confidentialite.md`       | ✅              |
| Notification CAI sous 72h si préjudice        | Art. 3.5        | Procédure documentée + alerte 48h aux clients | ✅              |
| EFVP pour projets impliquant des données      | Art. 3.3        | `EFVP-evaluation-facteurs-vie-privee.md`      | ✅              |
| Droit d'accès et portabilité                  | Art. 27         | `GET /api/privacy/export` (JSON/CSV)          | ✅              |
| Droit à l'effacement et purge                 | Art. 28         | Cron 90j + anonymisation irréversible         | ✅              |
| Chiffrement des données sensibles             | Art. 10         | AES-256-GCM + TLS                             | ✅              |
| Registre d'audit immuable                     | Art. 63.1       | Chaîne SHA-256 `DataAccessLog`                | ✅              |
| Hébergement au Québec documenté               | Art. 17         | À documenter avec l'hébergeur retenu          | ⚠️ En attente   |
| Consentement cookies                          | Loi 25 + LPRPDE | Bandeau cookies implémenté                    | ✅              |
| Mention sur le site (responsable, droits)     | Art. 3.2        | Politique de confidentialité complète         | ✅              |

---

_Document créé le 7 juin 2026 — Omar Talbi, Responsable de la protection des renseignements personnels, Nexiora Inc._
