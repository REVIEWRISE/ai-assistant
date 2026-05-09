# AI Assistant

Next.js + Prisma + Postgres app for AI-assisted appointment/chatbot workflows.

## Tech Stack

- Next.js 16
- React 19
- Prisma
- PostgreSQL 16
- TypeScript

## Prerequisites

- Node.js 20+
- npm
- Docker Desktop (for containerized setup)

## Quick Start (Docker)

1. Create an env file required by compose:

```bash
cat > .env.local <<'EOF'
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=
SEED_ADMIN_NAME=
EOF
```

2. Start app + database:

```bash
docker compose up --build
```

3. Open the app:

[http://localhost:3000](http://localhost:3000)

### What happens on container startup

The `app` service runs:

- `npm run db:setup`
  - `npm run db:migrate` (`prisma db push`)
  - `npm run db:seed`
- then starts Next.js dev server on `0.0.0.0:3000`

Database service (`postgres`) runs with:

- host: `localhost`
- port: `5432`
- user: `ai_user`
- password: `ai_password`
- database: `ai_assistant`

## Local Development (without Docker)

1. Install dependencies:

```bash
npm ci
```

2. Set your local environment variables in `.env.local` (at minimum `DATABASE_URL` and `NEXT_PUBLIC_APP_URL`).

Example starter file:

```env
DATABASE_URL=postgresql://ai_user:ai_password@localhost:5432/ai_assistant
NEXT_PUBLIC_APP_URL=http://localhost:3000
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=
SEED_ADMIN_NAME=
```

3. Run schema sync + seed:

```bash
npm run db:setup
```

4. Start the app:

```bash
npm run dev
```

## Useful Scripts

- `npm run dev` - start Next.js in dev mode
- `npm run build` - production build
- `npm run start` - start production server
- `npm run lint` - run ESLint
- `npm run db:migrate` - push Prisma schema to DB
- `npm run db:seed` - run seed script
- `npm run db:setup` - migrate + seed
- `npm run cron:review-sync` - run review sync cron script

## Seed Data

The seed script creates required development data for local testing.

You can customize seed behavior with environment variables (for example, admin identity and password) in your local `.env.local` file.

## Docker Commands

- Start: `docker compose up --build`
- Stop: `docker compose down`
- Reset DB volume: `docker compose down -v`
- View logs: `docker compose logs -f app`
- Append values to env file: `cat >> .env.local <<'EOF' ... EOF`
