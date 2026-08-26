# Change Management Policy

**Document owner:** [Security Officer / Engineering Lead name]
**Effective date:** [YYYY-MM-DD]
**Review cadence:** Annually, and on any change to the branching/deploy model.

## 1. Purpose

Defines how changes to the AI Assistant application move from development to production in a controlled, auditable way. Supports SOC 2 CC8.1.

## 2. Environments

| Environment | Branch | Domain | Host |
|---|---|---|---|
| Staging | `main` | `agent.staging.vyntrise.com` | Shared VPS (also hosts unrelated internal projects) |
| Production | `production` | `agent.vyntrise.com` | Dedicated VPS |

Promotion path: feature branch → PR → `main` (auto-deploys to staging) → PR from `main` → `production` (auto-deploys to production). Production never receives a direct push; it is only reached by promoting a commit that has already run on staging.

## 3. Required gate before any deploy

Every push to `main` or `production` runs the `build-and-test` GitHub Actions job before a deploy job is even eligible to run:
1. Install dependencies
2. Generate Prisma client
3. Lint
4. Typecheck
5. Build

A deploy only proceeds if all steps pass. This is enforced by workflow structure (`deploy-staging` / `deploy-production` jobs depend on `build-and-test` succeeding), not by convention.

## 4. Deploy mechanics

- Deploys build a versioned container image and push it to `ghcr.io/reviewrise/ai-assistant-app`, tagged both `:staging`/`:latest` and `:<tag>-<commit-sha>` for traceability back to the exact commit.
- The target host pulls the new image and recreates the containers (`docker compose pull && up -d`) rather than building on the production/staging host itself — the same artifact that passed CI is what runs.
- Each environment resolves its own GitHub Actions environment secrets (branch-policy restricted), so a production deploy cannot run with staging credentials or vice versa.
- Database schema changes apply via `db-sync.sh` against versioned SQL migrations in `db/migrations/` — `prisma db push` is not used in production, so schema changes are reviewable, ordered artifacts rather than ad hoc.

## 5. Rollback

- Because images are tagged with the commit SHA, rollback is: redeploy the previous known-good `:<tag>-<sha>` image rather than reverting code and re-running the full pipeline under time pressure.
- [Define: who is authorized to trigger a rollback, and the target time-to-rollback for a SEV1.]

## 6. Emergency changes

For a live incident (see [Incident Response Plan](./incident-response-plan.md)) requiring an immediate fix outside the normal PR flow:
- The change should still go through the `build-and-test` gate where feasible.
- Any direct/manual intervention on a host (bypassing the pipeline) must be documented after the fact and reconciled back into source control as soon as the incident is stable, so the deployed state and the repository do not silently diverge.
- [This was necessary during initial production cutover — manual SSH fixes were applied to unblock a live outage, then synced back to configuration files. Document each occurrence in the incident log.]

## 7. Infrastructure changes

Changes to shared infrastructure (nginx configuration, firewall rules, VPS-level configuration) outside the application's own repository:
- Require the same discipline as code changes: validate before applying (e.g., `nginx -t` before `reload`), keep a backup of the previous working configuration, and confirm the change didn't affect other services sharing the host — especially relevant on the shared staging VPS, which hosts unrelated projects.
- A production-impacting infrastructure change should be tested for validity before being applied live where possible.
