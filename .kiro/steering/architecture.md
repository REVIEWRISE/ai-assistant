# Architecture & Patterns

## Auth flow
- Session token = `crypto.randomUUID()` stored in `sessions` table, sent as `ai_session` httpOnly cookie
- `src/lib/auth-session.ts` — `getValidSession()` (cached per request), `requireSession()`, `requireAdminSession()`
- Middleware (`middleware.ts`) redirects unauthenticated requests; skips `/api/*`, `/embed/*`
- API routes must individually enforce auth — middleware does NOT protect them
- Logout: server action deletes session from DB + clears httpOnly cookie

## Database access
- Always use **Prisma client** (`src/lib/prisma.ts`) for app code
- Raw `pg` pool (`src/lib/db.ts`) only used in migration/schema-check scripts
- Schema changes: add migration in `db/migrations/NNN_name.sql` AND update `prisma/schema.prisma`
- Never use `prisma db push` in production — use `db-sync.sh` (applies SQL migrations then generates client)

## Server actions pattern
- All form mutations are Next.js Server Actions (`"use server"`)
- Auth check at top of every action — read session from cookie via `requireSession()` or inline
- Errors redirect back with `?error=<code>`, success with `?success=<code>`
- Never throw to the client — always redirect or return typed result objects

## API routes
- Public routes: `/api/embed/chatbot/*`, `/api/health`
- Webhook routes: `/api/webhooks/billing`, `/api/retell/webhook` — verified via HMAC (no session auth)
- Internal routes: `/api/me/*`, `/api/cron/*` — require session or cron secret

## Audit logging
- Table: `audit_events` (organizationId, actorId, action, metadata JSONB, createdAt)
- All auth events logged: `auth.login_success`, `auth.login_failed`, `auth.register`, `auth.logout`
- Provider connect/disconnect events logged inline in callback routes
- Pattern: fire-and-forget with `.catch(() => {})` — never block the main flow

## Rate limiting
- `src/lib/rate-limit.ts` — in-memory sliding window (single-instance safe)
- Login: 10 req / 15 min per IP, Register: 5 req / 1 hr per IP, Chatbot: 60 req / min per IP
- `src/lib/request-ip.ts` — reads `x-real-ip` / `x-forwarded-for` set by nginx

## Token encryption
- `src/lib/token-encryption.ts` — AES-256-GCM, requires `TOKEN_ENCRYPTION_KEY` env var (32-byte hex)
- All `provider_connections.token_data` writes go through `encryptTokenData()`
- All reads go through `decryptTokenData()` — handles legacy plaintext transparently
- Without the env var, tokens stored plaintext with a prod warning

## Organization feature access
- `assertOrgFeatureAccess(orgId, feature)` — throws/returns error if plan doesn't include feature
- `requireOrgFeature(orgId, feature)` — redirects if not included
- Features: `web_chatbot`, `review_channels`, `voice_agent`, `locations`

## Webhook security
- Billing webhook: HMAC-SHA256, `timingSafeEqual`, idempotent via `BillingWebhookEvent` dedup
- Retell webhook: HMAC-SHA256 + 5-min timestamp replay window (`src/lib/retell-webhook-verify.ts`)
- Health endpoint: external callers get `{status}` only; full details need `X-Health-Token` header
