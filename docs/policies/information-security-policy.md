# Information Security Policy

**Document owner:** [Security Officer name]
**Approved by:** [Management / Owner name]
**Effective date:** [YYYY-MM-DD]
**Review cadence:** Annually, and after any material change to the system architecture or a security incident.

## 1. Purpose and scope

This policy defines how Vyntrise protects the confidentiality, integrity, and availability of the AI Assistant platform (`agent.vyntrise.com`) and the data it processes on behalf of customers. It applies to all employees, contractors, and systems involved in developing, deploying, or operating the platform, and forms the top-level policy that the other documents in `docs/policies/` implement in detail:

- [Access Control Policy](./access-control-policy.md)
- [Data Classification Policy](./data-classification-policy.md)
- [Data Retention & Deletion Policy](./data-retention-deletion-policy.md)
- [Incident Response Plan](./incident-response-plan.md)
- [Change Management Policy](./change-management-policy.md)
- [Vendor & Third-Party Risk Management Policy](./vendor-risk-management-policy.md)
- [Business Continuity & Disaster Recovery Plan](./business-continuity-dr-plan.md)
- [Employee Security Policy](./employee-security-policy.md)
- [Vulnerability Management Policy](./vulnerability-management-policy.md)

## 2. Security objectives

Aligned to the SOC 2 Trust Services Criteria in scope (Security, Availability, Confidentiality — see `.kiro/steering/soc2-status.md` for current readiness status):

1. Restrict access to systems and data to authorized users on a least-privilege basis (CC6.1, CC6.6).
2. Protect data in transit and at rest.
3. Monitor systems for security events and respond to incidents in a timely, documented manner (CC7.2, CC7.3).
4. Maintain availability of the production service consistent with published commitments (A1.2).
5. Manage change to production systems through a controlled, auditable process (CC8.1).

## 3. Roles and responsibilities

| Role | Responsibility |
|---|---|
| Security Officer | Owns this policy set, coordinates incident response, tracks remediation |
| Engineering | Implements technical controls, follows change management and secure coding practices |
| Management/Owner | Approves policies, accepts residual risk, allocates budget for controls |

*(Fill in named individuals once roles are assigned — a SOC 2 auditor will expect this policy to name actual people, not just role titles.)*

## 4. Current technical controls (as implemented)

This is a living inventory — update it as controls change.

| Control area | Implementation |
|---|---|
| Authentication | httpOnly + secure session cookies, server-side session store (`sessions` table), rate-limited login (10 req/15min/IP) and registration (5 req/hr/IP) |
| Authorization | Role-based access control via `roles` / `user_roles` / `menu_access` tables; `requireSession()` / `requireAdminSession()` enforced per route |
| Encryption at rest | OAuth/provider tokens encrypted with AES-256-GCM (`src/lib/token-encryption.ts`), key supplied via `TOKEN_ENCRYPTION_KEY` |
| Encryption in transit | TLS via Let's Encrypt certificates on both environments, nginx-terminated |
| Audit logging | `audit_events` table records auth and provider-connection events with actor, action, timestamp |
| Webhook integrity | HMAC-SHA256 signature verification with timing-safe comparison and replay-window checks (billing and Retell webhooks) |
| Monitoring | Sentry error tracking (server, edge, client), Docker health checks on all services |
| Network hardening | UFW firewall, fail2ban on SSH, root SSH login disabled, key-based SSH access |
| Environment separation | Distinct staging (`agent.staging.vyntrise.com`) and production (`agent.vyntrise.com`) environments on separate VPS hosts, environment-scoped GitHub Actions secrets |
| CI/CD | Build-and-test gate (lint, typecheck, build) required before any deploy; deploys via versioned container images from `ghcr.io` |

## 5. Known gaps (tracked for remediation)

Per `.kiro/steering/soc2-status.md` Phase 2/4 — these should be closed before or during the audit window:

- Brute-force account lockout beyond rate limiting
- MFA for admin users
- Email verification enforcement
- Centralized log aggregation with defined retention
- Migration off `.env.production` files on the VPS to a secrets manager
- Automated, scheduled database backups with tested restore
- Third-party penetration test

## 6. Enforcement

Violation of this policy by employees or contractors may result in revocation of access and, where applicable, termination of engagement. Security exceptions must be documented and approved by the Security Officer with a defined expiry date.

## 7. Policy review

This policy and its subordinate documents are reviewed at least annually and whenever a significant change occurs (new production environment, new subprocessor, material incident).
