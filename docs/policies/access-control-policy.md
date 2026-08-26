# Access Control Policy

**Document owner:** [Security Officer name]
**Effective date:** [YYYY-MM-DD]
**Review cadence:** Annually, and on any change to the RBAC model or infrastructure access model.

## 1. Purpose

Defines how access to the AI Assistant application, its data, and the infrastructure it runs on is granted, reviewed, and revoked, on a least-privilege basis. Supports SOC 2 CC6.1 (logical access) and CC6.6 (credential/key management).

## 2. Application-level access control

### 2.1 Model
- Access is role-based: `roles` → `user_roles` (user-to-role) → `menu_access` (role-to-feature) tables in the primary database.
- Organization-level membership is tracked in `organization_members`; per-member menu overrides in `organization_member_menu_access`.
- Every session is a server-side record (`sessions` table) referenced by an `httpOnly`, `secure` cookie — no client-readable or client-forgeable session state.
- API routes enforce authorization individually via `requireSession()` / `requireAdminSession()` (`src/lib/auth-session.ts`); the global middleware handles redirects only and does not substitute for per-route checks.

### 2.2 Provisioning
- New user accounts are created via the registration flow or by an Admin through the Users management screen.
- Role assignment follows least privilege: new users receive the minimum role needed for their function. Admin role is granted only to personnel who need platform-wide configuration or audit access.

### 2.3 Deprovisioning
- When a user's access must be revoked (offboarding, role change, suspected compromise), an Admin removes their role assignment(s) and/or sets `account_status` to disabled.
- Active sessions for a revoked user are deleted from the `sessions` table so the change takes effect immediately rather than waiting for cookie expiry.
- [Add: SLA for how quickly offboarding must occur after HR/manager notification — e.g., within 24 hours.]

### 2.4 Periodic access review
- [Define cadence, e.g., quarterly] review of: active Admin-role accounts, stale accounts with no login in 90+ days, and organization membership vs. current staffing.
- Findings and actions taken are logged as an audit event or in the review record kept by the Security Officer.

## 3. Infrastructure-level access control

### 3.1 Server access
- SSH access to both the staging and production VPS hosts is key-based only for the `deploy` account; the private key never leaves the holder's machine and is not stored in the repository or CI logs.
- Root login over SSH is disabled on the production host.
- `fail2ban` is active on both hosts to throttle brute-force SSH attempts; UFW restricts inbound traffic to required ports only.
- No credential (password, SSH key, or otherwise) is shared over chat, email, or ticketing systems. Access changes happen via key exchange (`authorized_keys`) or the account holder running commands themselves.

### 3.2 CI/CD and secrets access
- Deployment secrets (`SERVER_SSH_KEY`, `POSTGRES_*`, `TOKEN_ENCRYPTION_KEY`, `HEALTH_CHECK_TOKEN`, provider API keys, etc.) are stored as GitHub Actions **environment secrets**, scoped separately per environment (`staging`, `production`).
- Production secrets are never reused for staging where a distinct value is required (e.g., `TOKEN_ENCRYPTION_KEY`, `POSTGRES_PASSWORD`, `SEED_ADMIN_PASSWORD`); staging uses sandbox/test third-party keys where the provider supports them.
- GitHub Environment branch policies restrict which branches can trigger a deploy that resolves production secrets (`production` branch → production environment only).
- `GITHUB_TOKEN` permissions are minimized per workflow (e.g., `contents: read` only where package publish isn't required).

### 3.3 Container registry access
- Images are pushed to `ghcr.io` under a dedicated PAT (`GHCR_PAT`) scoped to `read:packages` + `write:packages` only, not a broader personal token.

## 4. Encryption key management

- `TOKEN_ENCRYPTION_KEY` (AES-256-GCM, 32-byte hex) encrypts OAuth/provider tokens at rest (`provider_connections.token_data`). It is generated per environment, stored only as a GitHub Actions environment secret and in each host's `.env.production`, and is never committed to source control.
- Key rotation: [define process — e.g., generate new key, re-encrypt existing `token_data` rows, then update the secret. Not yet automated; document the manual runbook when defined.]

## 5. Third-party/vendor access

Any subprocessor granted access to production systems or data must be reviewed under the [Vendor & Third-Party Risk Management Policy](./vendor-risk-management-policy.md) before access is granted.

## 6. Exceptions

Any deviation from this policy (e.g., temporary elevated access for an incident) must be time-boxed, logged, and approved by the Security Officer, with access reverted at the end of the window.
