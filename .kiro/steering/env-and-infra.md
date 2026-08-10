# Environment Variables & Infrastructure

## Required env vars
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `OPENAI_API_KEY` | Chat completions, review replies, booking parse |
| `OPENAI_MODEL` | Model name (default: `gpt-4o-mini`) |
| `NEXT_PUBLIC_APP_URL` | Public base URL (e.g. `https://app.vyntrise.com`) |
| `TOKEN_ENCRYPTION_KEY` | 32-byte hex key for AES-256-GCM OAuth token encryption |
| `HEALTH_CHECK_TOKEN` | Bearer token to get full `/api/health` response |
| `VYNTRISE_WEBHOOK_SECRET` | HMAC secret for billing webhook signature verification |
| `BILLING_API_URL` | Vyntrise billing API base URL |
| `BILLING_API_KEY` | Vyntrise billing API key |
| `BILLING_PRODUCT_NAME` | Product slug in billing system (default: `agents`) |
| `BILLING_ADMIN_URL` | Billing admin dashboard URL |
| `RETELL_API_KEY` | Retell AI API key |
| `RETELL_USE_CUSTOM_LLM` | `true` to enable custom LLM WebSocket server |
| `RETELL_CUSTOM_LLM_WS_URL` | Custom LLM WebSocket URL (optional, defaults to `wss://DOMAIN/llm-websocket`) |
| `SMTP_HOST` | SMTP server (default: `smtp.gmail.com`) |
| `SMTP_PORT` | SMTP port (default: `587`) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASSWORD` | SMTP password |
| `BOOKING_EMAIL_FROM` | From address for booking confirmation emails |
| `BOOKING_NOTIFY_EMAIL` | Team notification email for new bookings |
| `POSTGRES_USER` | DB user (Docker only) |
| `POSTGRES_PASSWORD` | DB password (Docker only) |
| `POSTGRES_DB` | DB name (Docker only) |
| `SEED_ADMIN_EMAIL` | Admin seed account email |
| `SEED_ADMIN_NAME` | Admin seed account name |
| `SEED_ADMIN_PASSWORD` | Admin seed account password |

## Generate TOKEN_ENCRYPTION_KEY
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Add output to `.env.production` and as a GitHub Actions secret named `TOKEN_ENCRYPTION_KEY`.

## Infrastructure
- **App container**: `ai_assistant_app` on port 3015 → Next.js on 3000
- **Retell LLM container**: `ai_assistant_retell_llm` on port 3017 → WebSocket on 3001 (profile: `retell-custom-llm`)
- **DB container**: `ai_assistant_postgres` — data persisted to `postgres_data` volume
- **Uploads**: bind-mounted at `./data/uploads` → `/app/public/uploads`
- **nginx**: TLS termination, HTTP→HTTPS redirect, WebSocket proxy for `/llm-websocket/`

## CI/CD (GitHub Actions — `pipeline.yml`)
- `build-and-test` job: install → prisma generate → lint → typecheck → build
- `deploy` job: runs only on `main` push, SCP files to VPS then SSH deploy via `scripts/deploy.sh`
- All secrets injected via GitHub Actions secrets → written to `.env.production` on server
- Adding a new secret: add to `env:`, `envs:`, and `merge_env_var` section in pipeline + add GitHub secret

## Local dev
```bash
docker-compose up          # starts app + postgres (no retell LLM)
npm run dev                # Next.js dev server
npm run db:create          # create the database (safe to re-run — skips if exists)
npm run db:migrate         # prisma db push + generate
npm run db:seed            # seed admin user + roles
npm run db:setup           # db:create + db:migrate + db:seed (full fresh setup)
```

## Production deploy
```bash
scripts/deploy.sh $APP_DIR  # pulls latest, runs db-sync.sh, restarts containers
scripts/db-sync.sh          # applies SQL migrations in db/migrations/ then prisma generate
scripts/backup-db.sh        # pg_dump to ./backups/
```
