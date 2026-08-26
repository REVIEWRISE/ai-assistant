# Business Continuity and Disaster Recovery Plan

**Document owner:** [Security Officer / Engineering Lead name]
**Effective date:** [YYYY-MM-DD]
**Review cadence:** Annually, and after any infrastructure topology change. A restore test should accompany each review.

## 1. Purpose

Defines how Vyntrise maintains availability of the AI Assistant platform and recovers from infrastructure failure, data loss, or a security incident requiring rebuild. Supports SOC 2 A1.2 (availability) and A1.3 (recovery testing).

## 2. Current topology

- **Production:** dedicated VPS (`agent.vyntrise.com`), not shared with unrelated projects — deliberately separated from staging after an incident (see [Incident Response Plan](./incident-response-plan.md) §5) demonstrated the risk of shared infrastructure.
- **Staging:** separate VPS (`agent.staging.vyntrise.com`), shared with other internal projects; used for pre-production validation, not customer-facing.
- Both environments run the application as Docker containers (`app`, `retell-llm`, `postgres`) with health checks and `restart: unless-stopped`, fronted by nginx with TLS.
- Resource limits are sized for current expected load (10–50 users in the first 3 months); see `DEPLOYMENT.md` for the current spec and the signals that would trigger a resize.

## 3. Recovery objectives

[These are business decisions — fill in and get sign-off from Management. Suggested starting point given current maturity:]

| Metric | Target |
|---|---|
| RTO (Recovery Time Objective) — how long production may be down | [e.g., 4 hours] |
| RPO (Recovery Point Objective) — how much data loss is acceptable | [e.g., 24 hours] |

## 4. Backups

**Current status: automated, off-host copy configured, now with a dedicated management/observability tool; restore test still needed.**

- Backups are managed by **backup-manager** — a standalone service (separate repo, separate deploy, separate auth) purpose-built for this, rather than a page or script living inside the ai-assistant app itself. Independence matters here specifically: a backup tool that goes down when the thing it backs up goes down, or that depends on the same database it's protecting, isn't a reliable control. One instance runs per VPS (host-local, since it needs Docker access to `exec` into containers).
- It backs up two things for this app: the `postgres` service (`pg_dump`, gzip) and `data/uploads/` (org logos, `tar`) — the latter had no backup path at all before this tool existed.
- Retention is grandfather-father-son (7 daily / 4 weekly / 6 monthly) per target, an improvement over the previous flat 14-day cutoff — a mistake caught on day 20 is now recoverable.
- The dump is copied off-host to the staging VPS after each run, over a dedicated SSH key (`db_backup_relay`) that is restricted server-side to `scp`-only into `/home/deploy/backups-incoming/production` — it cannot open a shell or reach anything else on that host. This means a full loss of the production VPS does not also destroy its most recent backups.
- Every run (scheduled or manual) is recorded with status/size/duration in the tool's own dashboard, so a broken backup is visible without SSHing in to read a log file, and a stale-backup banner surfaces automatically if the last successful daily backup is more than 26 hours old.

Still required to fully close this gap:
1. **Test an actual restore** into a scratch environment on a defined cadence (e.g., quarterly) and record the result — an untested backup is not a control an auditor will credit. Not yet done.
2. Consider a true third-location backup (object storage) once budget allows — the current staging-VPS copy is a meaningful improvement over single-host storage, but both hosts are still under the same operator; a provider-level incident affecting both would not be covered.
3. Push-based failure alerting (e.g. a dead-man's-switch ping) beyond the dashboard's stale-backup banner, for cases where nobody happens to check the dashboard.

## 5. Disaster scenarios and response

| Scenario | Response |
|---|---|
| Single container crash | `restart: unless-stopped` recovers automatically; health checks surface persistent failure |
| VPS-level failure (host down) | Provision a replacement VPS, restore from the most recent database backup, redeploy the last known-good image tag via the existing CI/CD pipeline, repoint DNS |
| Database corruption/data loss | Restore from the most recent backup per §4; accept data loss up to the RPO |
| Compromise requiring full rebuild | Follow [Incident Response Plan](./incident-response-plan.md); rebuild the host from bootstrap scripts (`scripts/bootstrap.sh`) rather than trusting a potentially-compromised host, then restore data from a backup predating the compromise |
| Shared-host incident affecting staging | Staging is non-customer-facing, so this does not trigger the same RTO; production is unaffected due to environment separation |

## 6. Communication during an outage

[Define: status page, customer notification channel, and who is authorized to communicate externally during an incident.]

## 7. Plan testing

[Define cadence — e.g., annually — for a tabletop exercise or actual failover test exercising this plan, distinct from the backup-restore test in §4.]
