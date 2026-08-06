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

## Phase 2 — High Priority ⏳ NOT STARTED

| Item | Priority | Notes |
|---|---|---|
| Brute-force account lockout after N failed logins | High | Track per-user, notify by email on lockout |
| MFA / TOTP for admin users | High | `otpauth` + `qrcode` libraries, enforce for Admin role |
| Email verification enforcement | High | `email_verified` column exists, not checked |
| Centralized log aggregation + retention | High | Logtail or Datadog — Docker log driver integration |
| Secrets manager migration | High | Doppler recommended; away from `.env.production` on VPS |
| Nginx hardening — HSTS, security headers | High | See `deploy/nginx.site.example.conf` |

---

## Phase 3 — Policies ⏳ NOT STARTED

Required written policies (stored in `/docs/policies/` or a GRC tool):
- Information Security Policy
- Access Control Policy
- Incident Response Plan
- Data Classification Policy
- Data Retention & Deletion Policy
- Vendor Risk Management Policy (get SOC 2 / DPA from OpenAI, Retell, Stripe)
- Business Continuity & Disaster Recovery Plan
- Change Management Policy
- Employee Security Policy
- Vulnerability Management Policy

---

## Phase 4 — Pre-Audit ⏳ NOT STARTED

| Item | Notes |
|---|---|
| Third-party penetration test | OWASP Top 10 minimum |
| GRC platform | Vanta / Drata / Secureframe — pick one early |
| Staging environment | Currently deploys direct to prod on `main` push |
| Database backups | `scripts/backup-db.sh` exists but not automated/scheduled |
| Postgres firewall | Verify port 5432 not publicly reachable |
| Stripe webhook signature verification | `stripe.webhooks.constructEvent()` missing |
| Vendor BAAs | OpenAI DPA, Retell SOC 2 report, Stripe DPA |

---

## Known pre-existing issues (not introduced by us)
- `src/lib/stripe.ts` — outdated Stripe API version (`2026-06-24.dahlia` vs `2026-07-29.dahlia`)
- `prisma/seed.ts` + several scripts — `@next/env` type declarations missing
- Both are pre-existing, non-blocking for SOC 2
