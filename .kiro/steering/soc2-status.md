# SOC 2 Readiness Status

Target: **SOC 2 Type II** (Security + Availability + Confidentiality)
Audit window starts after Phase 2 is complete and 6 months of evidence accumulates.

---

## Phase 1 — Critical Fixes ✅ COMPLETE

| Item | Status | Files |
|---|---|---|
| Session cookie `httpOnly` + `secure` flags | ✅ Done | `login/actions.ts`, `register/actions.ts` |
| Server-side logout (httpOnly-safe) | ✅ Done | `logout/actions.ts`, `logout/page.tsx` |
| Rate limiting — login, register, chatbot API | ✅ Done | `lib/rate-limit.ts`, `lib/request-ip.ts` |
| Audit log — auth events (login/fail/register/logout) | ✅ Done | `login/actions.ts`, `register/actions.ts`, `logout/actions.ts` |
| Health endpoint — no internal details to external callers | ✅ Done | `api/health/route.ts` |
| OAuth token encryption at rest (AES-256-GCM) | ✅ Done | `lib/token-encryption.ts` + 6 call sites |
| CI/CD — new secrets wired (`TOKEN_ENCRYPTION_KEY`, `HEALTH_CHECK_TOKEN`, `VYNTRISE_WEBHOOK_SECRET`) | ✅ Done | `.github/workflows/pipeline.yml` |

**Required action before deploying**: Add `TOKEN_ENCRYPTION_KEY` to `.env.production` and GitHub Actions secrets.
Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

---

## Phase 2 — High Priority ⏳ IN PROGRESS

| Item | Priority | Notes |
|---|---|---|
| ~~Brute-force account lockout after N failed logins~~ | ~~High~~ | ✅ Done — `src/lib/account-lockout.ts`: locks after 5 failed attempts for 15 minutes, resets on success, sends a best-effort email notification via existing SMTP utility. Layered on top of the existing per-IP rate limit (`rate-limit.ts`), which only throttles a single IP. Migration `049_account_lockout.sql` adds `failed_login_attempts`/`locked_until` to `users`. |
| MFA / TOTP for admin users | High | `otpauth` + `qrcode` libraries, enforce for Admin role |
| ~~Email verification enforcement~~ | ~~High~~ | ✅ Actually already done — `app-shell.tsx` redirects unverified users to `/verify-email/pending`; `login/actions.ts` also redirects there post-login |
| Centralized log aggregation + retention | High | Logtail or Datadog — Docker log driver integration |
| Secrets manager migration | High | Doppler recommended; away from `.env.production` on VPS |
| ~~Security headers (HSTS, nosniff, frame-options, referrer-policy)~~ | ~~High~~ | ✅ Already done at the app layer — `next.config.ts` `headers()` — better than nginx since it's proxy-independent |
| CSP enforcement (currently Report-Only) | Medium | `next.config.ts` — deliberately staged; needs browser verification across main flows (inline theme-initializer script needs `'unsafe-inline'` or a nonce) before flipping from `Content-Security-Policy-Report-Only` to enforced `Content-Security-Policy` |
| Dependency vulnerability scanning in CI | High | ✅ `npm audit --audit-level=high` added to `build-and-test`, plus `.github/dependabot.yml` (npm/github-actions/docker, weekly). Currently `continue-on-error: true` — 4 high findings remain (`next`, `nodemailer` transitive deps) that need a tested major-version bump, not a forced fix in CI. Flip to blocking once those are cleared. Went from 15→5 findings (1 low, 4 high) via safe `npm audit fix`. |

---

## Phase 3 — Policies ✅ DRAFTED (needs owner sign-off)

Written and stored in `/docs/policies/`. Each still has `[bracketed placeholders]` for
business decisions only a human can make (named owners, RTO/RPO numbers, retention
periods, training cadence) — fill those in and get Management sign-off before treating
these as audit-ready.

- [Information Security Policy](../../docs/policies/information-security-policy.md)
- [Access Control Policy](../../docs/policies/access-control-policy.md)
- [Incident Response Plan](../../docs/policies/incident-response-plan.md)
- [Data Classification Policy](../../docs/policies/data-classification-policy.md)
- [Data Retention & Deletion Policy](../../docs/policies/data-retention-deletion-policy.md)
- [Vendor Risk Management Policy](../../docs/policies/vendor-risk-management-policy.md) — still needs actual DPA/SOC 2 report links from OpenAI, Retell, Stripe
- [Business Continuity & Disaster Recovery Plan](../../docs/policies/business-continuity-dr-plan.md)
- [Change Management Policy](../../docs/policies/change-management-policy.md)
- [Employee Security Policy](../../docs/policies/employee-security-policy.md)
- [Vulnerability Management Policy](../../docs/policies/vulnerability-management-policy.md)

---

## Phase 4 — Pre-Audit ⏳ NOT STARTED

| Item | Notes |
|---|---|
| Third-party penetration test | OWASP Top 10 minimum |
| GRC platform | Vanta / Drata / Secureframe — pick one early |
| ~~Staging environment~~ | ✅ Done — separate `main`→staging / `production`→production branches and VPS hosts, see `DEPLOYMENT.md` |
| ~~Database backups~~ | ✅ Managed by a standalone `backup-manager` service (own repo/deploy/auth — deliberately independent of ai-assistant, so it isn't affected by ai-assistant outages/redeploys and covers other services on the same boxes too). Backs up Postgres + `data/uploads/`, GFS retention (7 daily/4 weekly/6 monthly), off-host copy to staging, dashboard with run history + stale-backup alerting. Restore test still not done — see `business-continuity-dr-plan.md` §4. |
| ~~Postgres firewall~~ | ✅ Confirmed safe on both environments — `ai_assistant_postgres` publishes no host port in `docker-compose.prod.yml`, internal Docker network only. (Unrelated containers on the shared staging box — `deploy-vyntrize-postgres-1`, `vyntrise-sms-db-1` — do publish 5432/5433 to `0.0.0.0`; out of scope for this repo, flagged to those teams same as the earlier Redis finding.) |
| ~~Stripe webhook signature verification~~ | N/A in this repo — this app doesn't call `stripe.webhooks.constructEvent()` directly; billing webhooks arrive from the separate Vyntrise Billing service and are already HMAC-SHA256 + timing-safe verified (`api/webhooks/billing/route.ts`). If Vyntrise Billing itself calls Stripe's webhook directly, that verification lives in that service's own repo, out of scope here. |
| Vendor BAAs | OpenAI DPA, Retell SOC 2 report, Stripe DPA |

---

## Known pre-existing issues (not introduced by us)
- `src/lib/stripe.ts` — outdated Stripe API version (`2026-06-24.dahlia` vs `2026-07-29.dahlia`)
- `prisma/seed.ts` + several scripts — `@next/env` type declarations missing
- Both are pre-existing, non-blocking for SOC 2
