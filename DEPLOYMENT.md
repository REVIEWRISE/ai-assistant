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

## GitHub Secrets Configuration

Add the following secrets to your GitHub repository (Settings > Secrets and variables > Actions):

| Secret Name | Description | Example |
| :--- | :--- | :--- |
| `SERVER_HOST` | VPS IP address or hostname | `123.456.78.90` |
| `SERVER_USER` | SSH user | `root` or `ubuntu` |
| `SERVER_PORT` | SSH port | `22` |
| `SERVER_SSH_KEY` | Private SSH key | `-----BEGIN RSA PRIVATE KEY-----...` |
| `APP_DIR` | Deployment directory on server | `/var/www/ai-assistant` |
| `ENV_FILE_CONTENTS` | Contents of the production `.env` file | See below |

### Environment variables

Use **either**:

1. **`ENV_FILE_CONTENTS`** — one secret with the full `.env.production` file (recommended), or  
2. **Individual secrets** listed below (the deploy step builds `.env.production` from them).

See `.env.production.example` in the repo for a complete template.

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

You can set `RETELL_API_KEY` as its own GitHub secret; deploy merges it into `.env.production` even when using `ENV_FILE_CONTENTS`.

#### `ENV_FILE_CONTENTS` example

```env
POSTGRES_USER=ai_user
POSTGRES_PASSWORD=secure_password
POSTGRES_DB=ai_assistant
NEXT_PUBLIC_APP_URL=https://your-domain.com
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
RETELL_API_KEY=your_retell_api_key
DATABASE_URL=postgresql://ai_user:secure_password@postgres:5432/ai_assistant
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=secure_password
SEED_ADMIN_NAME=Admin

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASSWORD=your-google-app-password
BOOKING_EMAIL_FROM=VyntRise Bookings <you@gmail.com>
BOOKING_NOTIFY_EMAIL=you@gmail.com
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
curl -s http://localhost:3015/api/health | jq
```

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

## CI/CD Pipeline

The pipeline is defined in `.github/workflows/pipeline.yml`:

1.  **CI (Continuous Integration)**:
    - Triggered on push and pull requests to `main`.
    - Runs linting, typechecking, and production build.
2.  **CD (Continuous Deployment)**:
    - Triggered only on push to `main` after CI passes.
    - Connects to the VPS via SSH.
    - Pulls the latest code.
    - Builds and starts Docker containers using `docker-compose.prod.yml`.
    - Performs a health check on `http://localhost:3000/api/health`.
    - **Automatic Rollback**: If the health check fails after 10 retries, it automatically rolls back to the previous stable version.

## Manual Commands

- **Deploy**: `./scripts/deploy.sh /var/www/ai-assistant "$(cat .env.production)"`
- **Rollback**: `./scripts/rollback.sh /var/www/ai-assistant`
- **Logs**: `docker compose -f docker-compose.prod.yml logs -f`

## Optimization & Security

- **Multi-stage Docker Build**: Reduces image size and hides source code in the final image.
- **Standalone Output**: Next.js is configured to output only necessary files for production.
- **Resource Limits**: Docker Compose limits CPU and Memory usage for stability.
- **Healthchecks**: Integrated into both Docker and the deployment script.
- **Firewall**: UFW is configured during bootstrap to allow only essential traffic.
