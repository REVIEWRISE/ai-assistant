# Review Rise — Project Overview

## What it is
Multi-tenant SaaS platform for local businesses. Manages Google/Yelp review responses, appointment booking (chatbot + voice), CRM sync, and billing. Branded as **VyntRise** in the UI.

## Tech stack
- **Framework**: Next.js 16 (App Router, `output: standalone`)
- **Language**: TypeScript 5, React 19
- **Database**: PostgreSQL 16 via **Prisma 6** ORM (`prisma/schema.prisma`)
- **Styling**: Tailwind CSS v4
- **Auth**: Custom session-based (bcryptjs, UUID tokens in DB, httpOnly cookies)
- **Payments**: Vyntrise Billing API (primary) + Stripe (secondary)
- **AI**: OpenAI (chat replies, booking parse), Retell AI (voice agent)
- **Deployment**: Docker + nginx on a VPS, GitHub Actions CI/CD

## Key directories
```
src/
  app/
    (protected)/      # Auth-gated pages (dashboard, reviews, appointments, settings...)
    api/              # Route handlers (embed/chatbot, retell, webhooks, health)
    login/            # loginUser server action
    register/         # registerUser server action
    logout/           # logoutUser server action (server-side, httpOnly safe)
  lib/                # All shared business logic — ~70 files
  components/         # UI components
prisma/schema.prisma  # Single source of truth for DB schema
db/migrations/        # Raw SQL migrations (run by db-sync.sh alongside Prisma)
scripts/              # One-off scripts, cron, retell LLM server
deploy/               # nginx config example
```

## Multi-tenancy model
`users` → belong to `organizations` via `organization_members` (role: owner/member).
One user can belong to multiple orgs. Active org stored in `sessions.active_organization_id`.

## Feature flags / entitlements
Gated via `src/lib/entitlements.ts` against `organization.billing_status` + `plan_slug`.
Plans: `starter`, `growth`, `pro_voice`.
