# SoftFacture API (backend SaaS)

API REST **Node.js + Express** + **PostgreSQL** + **Prisma** + **JWT**, séparée du frontend Next.js.  
Même dialecte SQL que **Supabase** : migration future = brancher l’URL Supabase dans `DATABASE_URL`.

## MVP inclus

| Module       | Routes                                                                                                                                                                                                    |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth         | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`                                                                                                                                     |
| Organisation | `GET/PATCH /api/organizations` (JWT + rattachement org ; PATCH réservé **OWNER**)                                                                                                                         |
| Clients      | `GET/POST/PATCH/DELETE /api/clients` (`?q=` recherche)                                                                                                                                                    |
| Produits     | `GET/POST/PATCH/DELETE /api/products` (`?active=1`)                                                                                                                                                       |
| Factures     | `GET/POST/PATCH/DELETE /api/invoices`, `POST .../validate` (numéro **FAC-2026-0001** en transaction), `POST .../cancel`, `PATCH .../status`, `GET .../pdf` — brouillon **sans** numéro jusqu’à validation |
| Paiements    | `GET/POST /api/payments` (`?invoiceId=` sur GET) — enregistre un paiement, met à jour **PARTIALLY_PAID** / **PAID** selon le cumul vs TTC                                                                 |
| SuperAdmin   | `GET /api/superadmin/organizations`, `GET /api/superadmin/users`                                                                                                                                          |

Rôles JWT : `SUPERADMIN` (sans org), `OWNER`, `USER`.

## Démarrage

```bash
cd backend
cp .env.example .env
# éditer DATABASE_URL + JWT_SECRET (min 16 car.)

npm install
npm run db:create           # crée la base indiquée dans DATABASE_URL si absente (connexion à `postgres`)
npx prisma migrate deploy   # inclut validate + `20260503190000_payments`
npm run db:seed   # superadmin + organisation démo (clients, produits, factures, devis, paiements)
npm run dev
```

**Erreurs fréquentes**

- `The datasource.url property is required` : `DATABASE_URL` absent ou fichier `.env` non trouvé. Travailler depuis `backend/` avec un `.env` à la racine du dossier backend, ou dupliquer les variables à la racine du monorepo (le chargement tente aussi `../.env`).
- `Database ... does not exist` (P1003) : créer la base (`npm run db:create` ou `createdb <nom>`), puis relancer `migrate deploy` et `db:seed`.
- `P1010` / « User was denied access » : l’utilisateur PostgreSQL de `DATABASE_URL` n’a pas accès à cette base. En local, connectez-vous en superutilisateur (`psql -U postgres` ou l’utilisateur admin de Postgres.app) puis :
  ```sql
    GRANT CONNECT ON DATABASE softfacture TO votre_role;
    GRANT ALL ON SCHEMA public TO votre_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO votre_role;
  ```
  Ou donnez la propriété de la base : `ALTER DATABASE softfacture OWNER TO votre_role;`  
  Vérifiez aussi que le **mot de passe** dans l’URL correspond bien au rôle (un mauvais mot de passe peut parfois se traduire par un refus d’accès selon la config).
- **`P3014` / shadow database** (souvent avec Supabase ou un rôle sans droit `CREATEDB`) : n’utilisez pas `prisma migrate dev` sur cette base. Appliquez les migrations avec **`npm run db:migrate`** (`prisma migrate deploy`, sans shadow DB). En local avec Postgres.app, vous pouvez aussi créer une base shadow dédiée et définir `SHADOW_DATABASE_URL` dans `.env` si vous tenez à `migrate dev`.

Une fois `npm run dev` lancé :

- API : `http://localhost:4000` (ou `PORT`)
- Santé : `GET /health`

## Comptes après `npm run db:seed`

| Compte                         | Mot de passe     | Rôle                                           |
| ------------------------------ | ---------------- | ---------------------------------------------- |
| `superadmin@softfacture.local` | `SuperAdmin123!` | SUPERADMIN (sans org)                          |
| `owner@demo.softfacture.local` | `DemoOwner123!`  | OWNER — organisation **Démo SoftFacture SARL** |
| `user@demo.softfacture.local`  | `DemoUser123!`   | USER — même organisation                       |

Relancer le seed **supprime puis recrée** l’organisation dont le nom est exactement `Démo SoftFacture SARL` (cascade sur ses données). Les autres organisations ne sont pas touchées.

## Exemples

```bash
# Inscription (crée organisation + utilisateur OWNER)
curl -s -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"a@b.c","password":"secret1234","name":"Ali","organizationName":"Ma SARL"}'

# Login
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"a@b.c","password":"secret1234"}'
```

Réponse : `{ "token": "...", "user": { ... } }`.  
Envoyer `Authorization: Bearer <token>` sur les routes `/api/organizations`, `/api/clients`, etc.

## Prochaines étapes (hors MVP)

Devis, paiements, abonnements, e-invoice — tables et routes à ajouter dans le même service ou en modules.
