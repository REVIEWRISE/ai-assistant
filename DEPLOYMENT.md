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

### `ENV_FILE_CONTENTS` Example

```env
POSTGRES_USER=ai_user
POSTGRES_PASSWORD=secure_password
POSTGRES_DB=ai_assistant
NEXT_PUBLIC_APP_URL=https://your-domain.com
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
DATABASE_URL=postgresql://ai_user:secure_password@postgres:5432/ai_assistant
```

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
