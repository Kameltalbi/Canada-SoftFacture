# Contribution Guidelines

Thank you for your interest in contributing to SoftFacture!

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- npm or yarn

### Setup

1. Fork the repository
2. Clone your fork:

   ```bash
   git clone https://github.com/your-username/NewSoftfacture.git
   cd NewSoftfacture
   ```

3. Install dependencies:

   ```bash
   npm install
   cd backend
   npm install
   cd ..
   ```

4. Set up environment variables:

   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   ```

5. Start the database:

   ```bash
   docker-compose up -d
   ```

6. Run migrations and seed:

   ```bash
   cd backend
   npm run db:create
   npm run db:migrate
   npm run db:seed
   cd ..
   ```

7. Start the development servers:

   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev

   # Terminal 2 - Frontend
   npm run dev
   ```

## Development Workflow

1. Create a new branch for your feature:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following the code style guidelines

3. Run tests:

   ```bash
   # Backend tests
   cd backend
   npm test

   # Frontend E2E tests
   npm run test:e2e
   ```

4. Run linting:

   ```bash
   npm run lint
   ```

5. Commit your changes (pre-commit hooks will run automatically):

   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

6. Push to your fork:

   ```bash
   git push origin feature/your-feature-name
   ```

7. Create a Pull Request

## Code Style

- Use TypeScript for type safety
- Follow the existing code formatting (Prettier is configured)
- Write meaningful commit messages using conventional commits:
  - `feat:` for new features
  - `fix:` for bug fixes
  - `docs:` for documentation changes
  - `style:` for code style changes
  - `refactor:` for code refactoring
  - `test:` for adding tests
  - `chore:` for maintenance tasks

## Testing

- Write unit tests for new services and utilities
- Add integration tests for new API routes
- Add E2E tests for new user flows
- Ensure all tests pass before submitting a PR

## Project Structure

```
.
├── backend/           # Express API
│   ├── src/
│   │   ├── routes/   # API routes
│   │   ├── services/ # Business logic
│   │   ├── middleware/ # Express middleware
│   │   └── lib/      # Utilities
│   └── prisma/       # Database schema
├── src/              # Next.js frontend
│   ├── app/          # App router pages
│   ├── components/   # React components
│   └── lib/          # Utilities
└── e2e/              # E2E tests
```

## Pull Request Guidelines

- Provide a clear description of the changes
- Link related issues
- Include screenshots for UI changes
- Ensure all CI checks pass
- Request review from maintainers

## Questions?

Feel free to open an issue for questions or suggestions.
