# Accord de Traitement des Données (Data Processing Agreement)

# Annexe aux Conditions Générales d'Utilisation — Softfacture Canada

**Version :** 1.0  
**Date d'entrée en vigueur :** 7 juin 2026  
**Parties :**

- **Responsable du traitement (le « Client »)** : toute entreprise ou professionnel souscrivant aux services Softfacture
- **Mandataire (le « Prestataire »)** : Nexiora Inc., éditeur de la marque Softfacture Canada, dont le responsable de la protection des renseignements personnels est Omar Talbi (vieprivee@softfacture.ca)

---

## Préambule

Le présent Accord de Traitement des Données (ci-après « l'Accord ») est conclu en vertu de la _Loi sur la protection des renseignements personnels et les documents électroniques_ (LPRPDE) et de la _Loi modernisant des dispositions législatives en matière de protection des renseignements personnels_ (Loi 25 du Québec, L.Q. 2021, c. 25).

Il constitue une annexe contractuellement contraignante aux Conditions Générales d'Utilisation (CGU) de Softfacture et s'applique à tout traitement de renseignements personnels effectué par Softfacture pour le compte du Client.

---

## Article 1 — Objet et champ d'application

1.1 Le présent Accord encadre le traitement, par Softfacture à titre de **mandataire (sous-traitant)**, des renseignements personnels que le Client, à titre de **responsable du traitement**, lui confie dans le cadre de l'utilisation de la Plateforme de facturation SaaS.

1.2 Les renseignements personnels visés incluent notamment : les noms, adresses, adresses courriel et coordonnées des clients du Client saisis dans la Plateforme, ainsi que toute donnée permettant d'identifier directement ou indirectement une personne physique.

1.3 Le présent Accord ne porte pas sur les renseignements personnels du Client lui-même (administrateurs, utilisateurs du compte), traités par Softfacture à titre de responsable du traitement, tels que décrits dans la Politique de confidentialité.

---

## Article 2 — Obligations de Softfacture à titre de mandataire

2.1 **Agir exclusivement sur instruction**  
Softfacture s'engage à ne traiter les renseignements personnels du Client que sur les instructions documentées et légitimes de ce dernier, telles qu'exprimées par l'utilisation de la Plateforme ou par toute directive écrite transmise à vieprivee@softfacture.ca. Softfacture informera sans délai le Client si elle estime qu'une instruction contrevient à une loi applicable.

2.2 **Confidentialité du personnel**  
Softfacture s'assure que seuls les membres de son personnel dûment autorisés et soumis à une obligation de confidentialité ont accès aux renseignements personnels du Client.

2.3 **Mesures de sécurité**  
Softfacture met en œuvre et maintient des mesures de sécurité techniques et organisationnelles appropriées, comprenant notamment :

- Chiffrement AES-256-GCM des champs personnels sensibles au repos (_at-rest_) ;
- Chiffrement en transit via le protocole TLS 1.2 ou supérieur ;
- Isolation stricte des données par locataire (_Multi-Tenancy_, Row-Level Security PostgreSQL) ;
- Contrôle d'accès par rôles (RBAC) ;
- Registre d'audit immuable à chaîne de hachages (SHA-256).

  2.4 **Assistance au Client**  
  Sur demande écrite du Client, Softfacture l'assistera raisonnablement pour lui permettre de répondre aux demandes d'exercice de droits formulées par ses propres clients (accès, rectification, portabilité, retrait du consentement).

  2.5 **Retour ou destruction des données**  
  À l'expiration ou à la résiliation du contrat, Softfacture s'engage à :

- Maintenir les données accessibles pendant une période de grâce de **90 jours** calendriers ;
- Offrir au Client un export complet de ses données (format JSON ou CSV) via `GET /api/privacy/export` ;
- Procéder ensuite à la **destruction irréversible** des données d'accès et des renseignements personnels identifiables, et à l'**anonymisation irréversible** des données financières résiduelles requises à des fins d'obligation légale fiscale.

---

## Article 3 — Souveraineté et hébergement des données au Québec

3.1 Softfacture garantit que l'ensemble de l'infrastructure principale (serveurs d'application, bases de données, sauvegardes) est **physiquement hébergé sur le territoire de la province de Québec, Canada**.

3.2 Aucune donnée principale de facturation n'est transférée ni stockée de manière permanente en dehors du Québec pour des fins de traitement opérationnel.

3.3 Dans l'éventualité où un sous-traitant ultérieur (voir Article 5) impliquerait un transfert de données hors Québec (ex. : traitement de paiement par Stripe), Softfacture s'engage à :

- En informer le Client dans les présentes ou par mise à jour de la liste des sous-traitants ;
- S'assurer que des mesures contractuelles équivalentes à celles de la Loi 25 (art. 17) sont en place avec ledit sous-traitant.

---

## Article 4 — Obligation de notification en cas d'incident de confidentialité

4.1 En cas de constatation d'un incident de confidentialité susceptible de causer un **préjudice sérieux** au Client ou à ses propres clients (accès non autorisé, divulgation, perte, vol ou modification de renseignements personnels), Softfacture s'engage à :

**a)** Notifier le Client **dans un délai de 48 heures** suivant la détection de l'incident, par courriel à l'adresse de l'administrateur principal du compte, avec indication :

- de la nature de l'incident ;
- des catégories de renseignements personnels concernés ;
- du nombre approximatif d'individus affectés ;
- des mesures correctives immédiatement prises ou envisagées.

**b)** Collaborer pleinement avec le Client pour lui permettre d'effectuer ses propres obligations de notification auprès de la **Commission d'accès à l'information du Québec (CAI)** et, le cas échéant, auprès des personnes concernées, conformément à l'article 3.5 de la Loi 25.

**c)** Consigner l'incident dans le registre interne des incidents de confidentialité de Softfacture.

4.2 La notification prévue au présent article ne constitue pas une reconnaissance de responsabilité de la part de Softfacture.

---

## Article 5 — Gestion des sous-traitants ultérieurs

5.1 Le Client autorise Softfacture à avoir recours aux sous-traitants ultérieurs listés ci-après pour l'exécution de services spécifiques. Softfacture demeure seule responsable de leurs actes envers le Client.

| Sous-traitant                                         | Service                                        | Localisation                                                 |
| ----------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------ |
| Hébergeur cloud (OVHcloud / Aptum / AWS ca-central-1) | Infrastructure, bases de données, sauvegardes  | Québec, Canada                                               |
| Stripe Inc.                                           | Traitement sécurisé des paiements d'abonnement | Données de paiement chiffrées, conformité PCI-DSS            |
| Fournisseur SMTP (Postmark / Mailgun / Amazon SES)    | Envoi de courriels transactionnels             | Canada / États-Unis — données limitées aux en-têtes courriel |

5.2 Softfacture informera le Client de tout ajout ou remplacement d'un sous-traitant ultérieur avec un préavis de **30 jours**, par courriel ou notification dans la Plateforme. Le Client dispose alors d'un droit d'opposition motivé.

5.3 Tout sous-traitant ultérieur est lié par un accord de traitement imposant des obligations de sécurité équivalentes à celles du présent Accord.

---

## Article 6 — Durée, résiliation et effets

6.1 Le présent Accord prend effet à la date d'inscription du Client à la Plateforme Softfacture et demeure en vigueur pendant toute la durée du contrat principal, puis pendant la période de conservation résiduelle prévue à l'article 2.5.

6.2 La résiliation du contrat principal entraîne automatiquement la résiliation du présent Accord, sous réserve des obligations résiduelles de conservation et destruction.

---

## Article 7 — Droit applicable et règlement des différends

7.1 Le présent Accord est régi par les lois de la province de Québec et les lois fédérales du Canada applicables.

7.2 Tout différend découlant du présent Accord sera soumis à la compétence exclusive des tribunaux du district judiciaire de Montréal, Québec.

---

## Article 8 — Contact et responsable de la protection

Pour toute question relative au présent Accord :

**Omar Talbi**  
Responsable de la protection des renseignements personnels  
Nexiora Inc. — Softfacture Canada  
vieprivee@softfacture.ca

---

_Le présent Accord est réputé accepté par le Client lors de son inscription à la Plateforme Softfacture, conformément aux Conditions Générales d'Utilisation._
