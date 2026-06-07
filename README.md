# SoftFacture France

Solution SaaS de **facturation électronique** conforme **PDP / Factur-X** — pensée pour indépendants et PME.

## Architecture

- **Frontend**: Next.js 15.5.15 + React 19 + TypeScript + TailwindCSS
- **Backend**: Express + TypeScript + PostgreSQL + Prisma ORM
- **Authentification**: JWT
- **Internationalisation**: next-intl
- **Génération PDF**: @react-pdf/renderer (frontend) + pdfkit (backend)

## Fonctionnalités

- Gestion des organisations et utilisateurs
- Gestion des clients
- Gestion des produits
- Création et gestion des factures
- Création et gestion des devis
- Suivi des paiements
- Tableau de bord
- Export PDF

## Prérequis

- Node.js 20+
- PostgreSQL 16+
- npm ou yarn

## Démarrage rapide

### Base de données

```bash
# Démarrer PostgreSQL avec Docker Compose
docker-compose up -d

# Ou utiliser votre propre instance PostgreSQL
```

### Backend

```bash
cd backend
cp .env.example .env
# Éditer .env avec vos configurations (DATABASE_URL, JWT_SECRET)

npm install
npm run db:create
npm run db:migrate
npm run db:seed
npm run dev
```

L'API sera disponible sur `http://localhost:4000`

### Frontend

```bash
# À la racine du projet
cp .env.example .env
# Éditer .env avec NEXT_PUBLIC_API_URL=http://localhost:4000/api

npm install
npm run dev
```

L'application sera disponible sur `http://localhost:3000`

## Tests

### Backend

```bash
cd backend
npm test              # Lancer les tests
npm run test:coverage # Avec couverture
```

### Frontend E2E

```bash
npm run test:e2e      # Lancer les tests E2E
npm run test:e2e:ui   # Mode UI
npm run test:e2e:debug # Mode debug
```

## Scripts disponibles

### Frontend

- `npm run dev` - Serveur de développement
- `npm run build` - Build pour production
- `npm run start` - Serveur de production
- `npm run lint` - Linter ESLint
- `npm test:e2e` - Tests E2E Playwright

### Backend

- `npm run dev` - Serveur de développement
- `npm run build` - Build TypeScript
- `npm run start` - Serveur de production
- `npm test` - Tests Vitest
- `npm run db:create` - Créer la base de données
- `npm run db:migrate` - Appliquer les migrations
- `npm run db:seed` - Peupler la base de données
- `npm run db:studio` - Ouvrir Prisma Studio

## Structure du projet

```
.
├── backend/           # API Express
│   ├── src/
│   │   ├── routes/   # Routes API
│   │   ├── services/ # Logique métier
│   │   ├── middleware/ # Middlewares
│   │   └── lib/      # Utilitaires
│   ├── prisma/       # Schéma et migrations
│   └── vitest.config.ts
├── src/              # Frontend Next.js
│   ├── app/          # Pages et layout
│   ├── components/   # Composants React
│   ├── lib/          # Utilitaires
│   └── i18n/         # Configuration i18n
├── prisma/           # Schéma Prisma frontend
├── e2e/              # Tests E2E Playwright
└── .github/          # Workflows CI/CD
```

## Comptes de démonstration

Après `npm run db:seed` dans le backend :

| Email                        | Mot de passe   | Rôle       |
| ---------------------------- | -------------- | ---------- |
| superadmin@softfacture.local | SuperAdmin123! | SUPERADMIN |
| owner@demo.softfacture.local | DemoOwner123!  | OWNER      |
| user@demo.softfacture.local  | DemoUser123!   | USER       |

## CI/CD

Le projet utilise GitHub Actions pour :

- Tests backend sur chaque push/PR
- Tests frontend sur chaque push/PR
- Tests E2E sur chaque push/PR
- Build automatique

## Documentation API

Voir [backend/README.md](./backend/README.md) pour la documentation détaillée de l'API.

## Licence

À définir
