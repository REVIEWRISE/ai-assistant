# Production Deployment Guide

This repository is equipped with a production-grade CI/CD pipeline using GitHub Actions, Docker, and automatic rollbacks.

## Infrastructure Requirements

- A Linux VPS (Ubuntu 22.04+ recommended)
- Domain name (optional, but recommended for SSL)
- SSH access to the server

## Server Preparation

1.  **Initial Bootstrap**:
    Run the bootstrap script on your fresh server to install Docker and configure the firewall:
    ```bash
    curl -sSL https://raw.githubusercontent.com/Abenezer01/ai-assistant-main/main/scripts/bootstrap.sh | bash
    ```

2.  **Application Directory**:
    Create the directory where the app will live:
    ```bash
    mkdir -p /var/www/ai-assistant
    ```

## Two environments: staging and production

There are two VPSs, two GitHub Environments, and two branches:

| | Branch | GitHub Environment | Domain |
| :--- | :--- | :--- | :--- |
| Staging | `main` | `staging` | `https://staging.agent.vyntrise.com` |
| Production | `production` | `production` | `https://agent.vyntrise.com` |

**Workflow:** land feature work on `main` (auto-deploys to staging) → verify it there → open a PR from `main` into `production` → merging it deploys to the production VPS. `.github/workflows/pipeline.yml` runs `build-and-test` on both branches, then calls the reusable `.github/workflows/deploy.yml` once per environment, gated by which branch was pushed.

**How secrets resolve:** GitHub Environment secrets fall back to repo-level secrets of the same name when the environment doesn't have its own override (Settings → Environments → *environment name* → Add secret). Practically:

- **`staging`** needs almost no new secrets — it's the same VPS that's been running all along. Only add environment-scoped overrides for what should actually differ from what's already set at the repo level: `NEXT_PUBLIC_APP_URL` → `https://staging.agent.vyntrise.com`, and sandbox/test versions of `OPENAI_API_KEY` / `RETELL_API_KEY` / billing keys wherever the provider supports a sandbox — otherwise staging traffic shows up as real usage/cost, or worse, triggers a real billing webhook.
- **`production`** needs a full, fresh set of environment-scoped secrets — new VPS, new everything: `SERVER_HOST`/`SERVER_USER`/`SERVER_PORT`/`SERVER_SSH_KEY`/`APP_DIR` pointed at the new box, its own `TOKEN_ENCRYPTION_KEY`/`HEALTH_CHECK_TOKEN`/`POSTGRES_*`/`SEED_ADMIN_*` (don't reuse staging's), `NEXT_PUBLIC_APP_URL` → `https://agent.vyntrise.com`, and whatever your real production-grade third-party keys are. `GHCR_USER`/`GHCR_PAT` can be shared across both if you'd rather not manage two PATs — it's a read-only package token either way.

**nginx, one domain per box:** the old (staging) VPS needs a new server block for `staging.agent.vyntrise.com` alongside/replacing its current one for `agent.vyntrise.com`; the new (production) VPS gets a server block for `agent.vyntrise.com` (see `deploy/nginx.site.example.conf`, `sudo certbot --nginx -d <domain>` for each). Point `agent.vyntrise.com`'s DNS record at the new VPS only after it's verified working, to avoid a window where the domain resolves to a box that isn't ready yet; add `staging.agent.vyntrise.com` pointing at the old VPS's existing IP.

## GitHub Secrets Configuration

The table below applies to the `staging` environment (and to the repo level, as the fallback both environments share). Add the following secrets to your GitHub repository (Settings > Secrets and variables > Actions):

| Secret Name | Description | Example |
| :--- | :--- | :--- |
| `SERVER_HOST` | VPS IP address or hostname | `123.456.78.90` |
| `SERVER_USER` | SSH user | `root` or `ubuntu` |
| `SERVER_PORT` | SSH port | `22` |
| `SERVER_SSH_KEY` | Private SSH key | `-----BEGIN RSA PRIVATE KEY-----...` |
| `APP_DIR` | Deployment directory on server | `/var/www/ai-assistant` |
| `ENV_FILE_CONTENTS` | Contents of the production `.env` file | See below |
| `BILLING_API_URL` | Billing API base URL | `https://billing.vyntrise.com/api/v1` |
| `BILLING_API_KEY` | Billing service API key | `vbk_live_…` |
| `BILLING_PRODUCT_NAME` | Billing product slug | `agents` |
| `BILLING_ADMIN_URL` | Billing Admin portal URL | `https://billing.vyntrise.com` |
| `GHCR_USER` | GitHub username the server uses to pull the built image | `your-github-username` |
| `GHCR_PAT` | Personal access token, scoped to `read:packages` only | `ghp_…` |
| `SENTRY_DSN` | Optional. Error tracking — safe to omit, the SDK no-ops without it. See "Error tracking (Sentry)" below | `https://…@…ingest.sentry.io/…` |

#### Container registry (ghcr.io)

The app image is built once in GitHub Actions and pushed to `ghcr.io/reviewrise/ai-assistant-app` — the production VPS only pulls and runs it (`docker compose pull && up -d`), it never runs `next build` itself. This removes the biggest memory-pressure moment from every deploy.

The package is kept **private** (it contains server-side business logic, not just the client bundle already shipped to browsers), so the server needs its own credentials to pull:

1. On GitHub: **Settings → Developer settings → Personal access tokens → Fine-grained tokens** (or classic, if your org requires it).
2. Scope it to **this repository only**, permission **Contents: read** is not needed — just **Packages: read**.
3. Add the token as the `GHCR_PAT` secret, and your GitHub username as `GHCR_USER`.

The CI job itself pushes using the automatic `GITHUB_TOKEN` (no extra secret needed for that direction) — `GHCR_PAT` is only for the server's *pull*, since the CI runner's token expires when the job ends.

### Environment variables

Use **either**:

1. **`ENV_FILE_CONTENTS`** — one secret with the full `.env.production` file (recommended), or  
2. **Individual secrets** listed below (the deploy step builds `.env.production` from them).

See `.env.production.example` in the repo for a complete template.

#### Required security secrets (SOC 2 CC6.1 / CC6.6)

| Secret | Description |
| :--- | :--- |
| `TOKEN_ENCRYPTION_KEY` | 32-byte hex key encrypting OAuth tokens at rest. **The app refuses to start in production without it.** Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `HEALTH_CHECK_TOKEN` | Shared secret required for `/api/health` to return internal DB/schema details; without a matching `X-Health-Token` header, external callers only get `{"status": "healthy"}`. Generate: `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"` |

#### Organization logo in booking emails

Upload a **company logo** per organization under **Appointments → Organization → Edit organization**. The logo is stored at `organizations.logo_url` and shown in the email header (absolute URL from `NEXT_PUBLIC_APP_URL`). If no org logo is set, the app may fall back to the connected calendar provider’s logo.

#### Required for booking confirmation emails

| Secret | Description |
| :--- | :--- |
| `SMTP_USER` | Gmail address used to send mail |
| `SMTP_PASSWORD` | [Google App Password](https://myaccount.google.com/apppasswords) (not your normal Gmail password) |
| `BOOKING_EMAIL_FROM` | Optional. Example: `VyntRise Bookings <you@gmail.com>` |
| `BOOKING_NOTIFY_EMAIL` | Optional extra inbox for “new booking” alerts |
| `SMTP_HOST` | Optional. Default `smtp.gmail.com` |
| `SMTP_PORT` | Optional. Default `587` |

`NEXT_PUBLIC_APP_URL` must be your **public** site URL (used in team notification links).

#### Voice Support (Retell AI)

| Secret | Description |
| :--- | :--- |
| `RETELL_API_KEY` | Retell dashboard → Settings → API Keys. Powers Voice Support sync (create agents, voices, prompts). |

**Phone booking:** When enabled on Voice Support → Agent & Voice → Knowledge, Retell calls:
- `POST /api/retell/tools/check-availability` — verify a slot before booking
- `POST /api/retell/tools/book-appointment` — create the appointment

`NEXT_PUBLIC_APP_URL` must be the public HTTPS URL Retell can reach (same as embed chatbot).

You can set `RETELL_API_KEY` as its own GitHub secret; deploy merges it into `.env.production` even when using `ENV_FILE_CONTENTS`.

| Secret | Description |
| :--- | :--- |
| `RETELL_USE_CUSTOM_LLM` | Set to `true` to start the `retell-llm` WebSocket container on deploy |
| `OPENAI_MODEL` | Optional. Model for live voice calls (default `gpt-4o-mini`) |
| `RETELL_CUSTOM_LLM_WS_URL` | Optional. Override WebSocket URL; otherwise derived from `NEXT_PUBLIC_APP_URL` + nginx |

These are merged into `.env.production` on every deploy, including when using `ENV_FILE_CONTENTS`.

#### Vyntrise Billing microservice

Plan catalog (prices + contents) is owned by Billing — this app only reads it.
Self-serve billing follows the platform onboarding flow:

1. Create workspace locally
2. `POST /billing/admin/customers` (`name`, `primaryEmail`) → `customer.id`
3. Store `organizations.billing_customer_id`
4. `POST /billing/checkout/create` with that `customerId`
5. Stripe → Billing webhook unlocks the org (`markOrgPaid`)
6. Paid feature checks can use `GET /billing/admin/entitlements?customerId=…` (falls back to local plan matrix)

Registration happens on workspace create / plan select, and again as a safety net before checkout.

| Secret | Description |
| :--- | :--- |
| `BILLING_API_URL` | Optional. Default `https://billing.vyntrise.com/api/v1` |
| `BILLING_API_KEY` | Service API key from Billing Admin → API Keys (`vbk_…`) |
| `BILLING_PRODUCT_NAME` | Optional. Product slug (default `agents`) |
| `BILLING_ADMIN_URL` | Optional. Billing Admin portal URL (default `https://billing.vyntrise.com`) |
| `VYNTRISE_WEBHOOK_SECRET` | Platform webhook signing secret (`whsec_vbk_…`) from Billing Admin → Platform Webhooks |
| `APP_URL` | Optional public app origin for Checkout success/cancel URLs (falls back to `NEXT_PUBLIC_APP_URL`) |

Stripe keys (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`) are **not** required in this app when checkout is created by Billing.

You can set these as individual GitHub secrets; deploy merges them into `.env.production` even when using `ENV_FILE_CONTENTS`.

Without `BILLING_API_KEY`, landing and `/billing-admin/plans` show empty state (no static fallback).

Register platform webhook URL `https://<your-domain>/api/webhooks/billing` in Billing Admin for product `agents`, events: `subscription.activated`, `subscription.manually_activated`, `subscription.canceled`, `subscription.paused`, `invoice.paid`.

Checkout return URLs:
- Success: `https://<your-domain>/billing/success?session_id={CHECKOUT_SESSION_ID}`
- Cancel: `https://<your-domain>/billing/canceled`

#### `ENV_FILE_CONTENTS` example

```env
POSTGRES_USER=ai_user
POSTGRES_PASSWORD=secure_password
POSTGRES_DB=ai_assistant
NEXT_PUBLIC_APP_URL=https://your-domain.com
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
RETELL_API_KEY=your_retell_api_key
RETELL_USE_CUSTOM_LLM=true
# Optional override; defaults to wss://your-domain.com/llm-websocket when nginx proxies /llm-websocket → :3017
# RETELL_CUSTOM_LLM_WS_URL=wss://your-domain.com/llm-websocket
RETELL_CUSTOM_LLM_PORT=3001
DATABASE_URL=postgresql://ai_user:secure_password@postgres:5432/ai_assistant
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=secure_password
SEED_ADMIN_NAME=Admin

# Required — see "Required security secrets" above
TOKEN_ENCRYPTION_KEY=...64-char-hex...
HEALTH_CHECK_TOKEN=...random-hex...

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASSWORD=your-google-app-password
BOOKING_EMAIL_FROM=VyntRise Bookings <you@gmail.com>
BOOKING_NOTIFY_EMAIL=you@gmail.com

BILLING_API_URL=https://billing.vyntrise.com/api/v1
BILLING_API_KEY=vbk_live_...
BILLING_PRODUCT_NAME=agents
BILLING_ADMIN_URL=https://billing.vyntrise.com
VYNTRISE_WEBHOOK_SECRET=whsec_vbk_...
APP_URL=https://your-domain.com
```

### Will deploy wipe my database?

**No**, for normal deploys:

- Postgres data lives in the Docker volume `postgres_data`. Rebuilding the app container does **not** delete that volume.
- Deploy only runs **`prisma db push`** (adds missing tables/columns). It does **not** run `prisma db seed` on production.
- `db push` runs **without** `--accept-data-loss`, so incompatible schema changes **fail the deploy** instead of silently dropping columns or rows.

Your appointments, users, organizations, and other rows stay in place. Only the schema is updated to match `prisma/schema.prisma`.

**First-time setup only** (empty database): run seed once manually if you need the default admin and menu items:

```bash
docker compose -f docker-compose.prod.yml exec app npx prisma db seed
```

### Database schema sync

Production keeps Postgres in sync with `prisma/schema.prisma` automatically:

1. On every deploy, the app container runs `scripts/db-sync.sh` (`prisma db push`) **before** starting the server.
2. `/api/health` returns **503** until all expected tables exist (including `appointments.customer_email`).
3. `scripts/deploy.sh` only succeeds when health reports `"status":"healthy"` and `"schemaInSync":true`.

`db/migrations/*.sql` are historical reference only; **do not** rely on them on prod. Add new columns/models to `prisma/schema.prisma` and deploy.

Manual sync on the server (if needed):

```bash
cd /var/www/ai-assistant
docker compose -f docker-compose.prod.yml exec app sh scripts/db-sync.sh
docker compose -f docker-compose.prod.yml restart app
```

Destructive schema changes require setting `PRISMA_DB_PUSH_ACCEPT_DATA_LOSS=1` on the app service (not recommended for routine deploys).

### Verify after deploy

```bash
curl -s -H "X-Health-Token: $HEALTH_CHECK_TOKEN" http://localhost:3015/api/health | jq
```

Without the `X-Health-Token` header, `/api/health` only returns `{"status": "healthy"}` — internal schema/DB details are withheld from external callers (SOC 2 CC6.6).

Expect:

```json
{
  "status": "healthy",
  "schema": {
    "schemaInSync": true,
    "missingTables": [],
    "customerEmailColumn": true
  },
  "bookingEmail": {
    "smtpConfigured": true,
    "customerEmailColumn": true
  }
}
```

If `schemaInSync` is `false`, check `missingTables` in the response and run `docker compose -f docker-compose.prod.yml logs app` to confirm `prisma db push` succeeded on startup.

If `smtpConfigured` is `false`, SMTP secrets are missing from `.env.production`.

### Retell Custom LLM (your OpenAI key on live calls)

When `RETELL_USE_CUSTOM_LLM=true`, deploy starts an extra `retell-llm` container (WebSocket on host port **3017**). Retell connects to `wss://your-domain.com/llm-websocket` — same host as the app if you use the nginx example.

1. Add to `.env.production` (or `ENV_FILE_CONTENTS`):

```env
RETELL_USE_CUSTOM_LLM=true
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

2. Install nginx using `deploy/nginx.site.example.conf` (replace `YOUR_DOMAIN`, enable SSL with certbot). The `/llm-websocket/` location must proxy to `127.0.0.1:3017`.

3. Deploy as usual — `scripts/deploy.sh` detects custom LLM and starts the `retell-llm` service.

4. **Migrate existing Retell agents** (one-time, on the server):

```bash
cd /var/www/ai-assistant
docker compose -f docker-compose.prod.yml --profile retell-custom-llm \
  run --rm retell-llm node dist/migrate-retell-to-custom-llm.js
```

Or re-save each voice agent in the admin UI (same sync effect).

5. Verify:

```bash
curl -s http://localhost:3017/
curl -s https://your-domain.com/api/health | jq
```

Local dev without nginx: run `npm run retell:llm`, expose with `ngrok http 3001`, set `RETELL_CUSTOM_LLM_WS_URL` to the ngrok `wss://…/llm-websocket` URL.

## CI/CD Pipeline

The pipeline is defined in `.github/workflows/pipeline.yml`, which calls the reusable `.github/workflows/deploy.yml` once per environment:

1.  **CI (Continuous Integration)**:
    - Triggered on push and pull requests to `main` or `production`.
    - Runs linting, typechecking, and production build.
2.  **CD (Continuous Deployment)** — `deploy-staging` on push to `main`, `deploy-production` on push to `production`, both after CI passes, each calling `deploy.yml` with its own `environment:` (which is what resolves that environment's GitHub secrets — see "Two environments" above):
    - Builds the Docker image and pushes it to `ghcr.io/reviewrise/ai-assistant-app` (tagged `staging`/`latest` and `<tag>-<sha>`) — this is the only place `next build` ever runs; neither VPS builds it.
    - Connects to that environment's VPS via SSH, syncs `docker-compose.prod.yml` and the `scripts/`/`deploy/` directories (the app image itself carries everything else now).
    - Pulls the new image and starts containers using `docker-compose.prod.yml`.
    - Performs a health check on `http://localhost:3000/api/health`.
    - **Automatic Rollback**: If the health check fails after 10 retries, it automatically rolls back to the previous stable version.

## Manual Commands

- **Deploy**: `./scripts/deploy.sh /var/www/ai-assistant "$(cat .env.production)"`
- **Rollback**: `./scripts/rollback.sh /var/www/ai-assistant`
- **Logs**: `docker compose -f docker-compose.prod.yml logs -f`

### Database backups (SOC 2 A1.2)

Postgres data lives only in the `postgres_data` Docker volume on the VPS — there is no managed/offsite backup by default. Set up nightly dumps:

```bash
chmod +x scripts/backup-db.sh
crontab -e
# Add:
0 2 * * * /var/www/ai-assistant/scripts/backup-db.sh /var/www/ai-assistant >> /var/log/db-backup.log 2>&1
```

This writes timestamped, gzip-compressed dumps to `<APP_DIR>/backups/` and prunes anything older than 14 days. Copy that directory offsite periodically (e.g. `rsync`/`scp` to another host or object storage) — a backup that only lives on the same VPS doesn't protect against VPS loss.

**Restore:**

```bash
cd /var/www/ai-assistant
gunzip -c backups/ai_assistant_20260101_020000.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

### Error tracking (Sentry)

Wired but inert by default — the SDK no-ops safely with no DSN configured. To turn it on:

1. Sign up at [sentry.io](https://sentry.io), create a Next.js project, copy the DSN.
2. Add it as the **`SENTRY_DSN` GitHub secret**.

**Important:** it must be set as a GitHub secret, not just added to `.env.production` on the server. The browser-side DSN (`instrumentation-client.ts`) gets baked into the client JS bundle *at build time* — and the build now happens in CI (see Container registry section), before `.env.production` on the server is even relevant. Setting it only on the server would fix server-side error capture but leave the browser silently uninstrumented. The next push to `main` after adding the secret will produce a build with it correctly included.

Source-map upload to Sentry is not wired up yet (`SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/`SENTRY_PROJECT` in `next.config.ts` are read but nothing currently passes them into the CI build) — errors will report with the built/minified stack until that's added, following the same build-arg pattern as `NEXT_PUBLIC_SENTRY_DSN` above.

### Content-Security-Policy

`next.config.ts` ships a baseline CSP in `Content-Security-Policy-Report-Only` mode (SOC 2 CC6.6). It does not block anything yet — browsers log would-be violations to the devtools console instead. Before enforcing it:

1. Deploy and click through the main flows (login, dashboard, appointments, reviews, the `/embed/chatbot` widget embedded in a real iframe) with devtools open.
2. Fix any logged CSP violations (e.g. an external script/style/image domain not in the allowlist) by extending `CSP_REPORT_ONLY` / `CSP_REPORT_ONLY_EMBED` in `next.config.ts`.
3. Once a full pass shows no violations, rename the header key from `Content-Security-Policy-Report-Only` to `Content-Security-Policy` in `next.config.ts` to start enforcing it.

### Scaling beyond one app instance

`src/lib/rate-limit.ts` (login/register/chatbot brute-force protection) is an **in-process, single-instance** in-memory store — it resets on every restart and is not shared across replicas. It is correct for the current single-`app`-container deployment (`docker-compose.prod.yml`). Before running more than one app replica (e.g. behind a load balancer), replace it with a shared store (Redis/Upstash) using the same `checkRateLimit` interface — otherwise brute-force protection silently only covers whichever instance a given request happens to hit.

### TLS configuration

`deploy/nginx.site.example.conf` terminates TLS via certbot's nginx plugin (`sudo certbot --nginx -d YOUR_DOMAIN`), which manages the certificate renewal and configures modern TLS protocol/cipher settings (via its bundled `options-ssl-nginx.conf`) automatically — no manual cipher/protocol hardening is needed in the nginx template itself. `Strict-Transport-Security` is set at the application layer (see Content-Security-Policy section below) so it applies regardless of proxy config.

### Future work: MFA and self-service password reset (deferred)

Not yet implemented. Intended design, documented here for SOC 2 audit purposes:

- **Password reset**: a `PasswordResetToken` record (random token, short expiry, single-use) created on request and emailed to the account's address via the existing SMTP/nodemailer setup (`src/lib/booking-email.ts` already wires SMTP — reuse that transport). The reset link consumes the token, rotates `passwordHash`, and invalidates all existing `Session` rows for that user.
- **MFA**: TOTP-based (e.g. `otplib`), rolled out to Admin-role accounts (`requireAdminSession` gate) first, then optionally exposed to all users. Requires a `mfaSecret` column on `User` and a challenge step inserted into `loginUser` (`src/app/login/actions.ts`) after password verification, before session creation.

## Optimization & Security

- **Multi-stage Docker Build**: Reduces image size and hides source code in the final image.
- **CI-Built Images**: The image is built once in GitHub Actions and pulled from `ghcr.io` — the production VPS never runs `next build` itself (see Container registry section above).
- **Standalone Output**: Next.js is configured to output only necessary files for production.
- **Resource Limits**: Docker Compose limits CPU and Memory usage for stability (`app`/`retell-llm`: 1.5 CPU / 1GB, `postgres`: 1.5 CPU / 2GB — sized for ~25–100 active orgs with public chatbot-widget and voice traffic; revisit if usage grows well past that).
- **Healthchecks**: Integrated into both Docker and the deployment script.
- **Firewall**: UFW is configured during bootstrap to allow only essential traffic.
- **fail2ban**: Bans repeated failed SSH login attempts — the VPS has root SSH reachable from the internet, so this matters.
- **SSH hardening**: Password authentication is disabled during bootstrap; deploys already authenticate via `SERVER_SSH_KEY`.
- **Swap file**: A 2GB swap file is created during bootstrap as insurance against memory pressure, independent of how much RAM is provisioned.
- **Docker log rotation**: `json-file` logs are capped (10MB × 3 files per container) during bootstrap so container logs can't fill the disk unbounded over months of real traffic.

### Recommended server spec

Sized for the expected first 6 months (25–100 active orgs, public chatbot widget live on customer sites, voice/Retell actively used):

| Resource | Spec |
| :--- | :--- |
| vCPU | 4 |
| RAM | 8 GB |
| Disk | 100 GB SSD |
| Bandwidth | 4–5 TB/mo (most "business" VPS tiers already include this) |

`next build` no longer runs on this box (see CI-Built Images above), which removes the single biggest memory spike that would otherwise factor into this sizing.
