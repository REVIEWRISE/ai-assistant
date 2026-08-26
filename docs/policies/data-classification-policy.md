# Data Classification Policy

**Document owner:** [Security Officer name]
**Effective date:** [YYYY-MM-DD]
**Review cadence:** Annually, and when a new data type is introduced.

## 1. Purpose

Defines classification levels for data handled by the AI Assistant platform, so that handling, access, and protection requirements scale with sensitivity. Supports SOC 2 CC6.1 and the [Data Retention & Deletion Policy](./data-retention-deletion-policy.md).

## 2. Classification levels

| Level | Definition | Handling requirement |
|---|---|---|
| **Public** | Safe for unrestricted disclosure | No special handling |
| **Internal** | Not for external release, but low sensitivity if disclosed | Access limited to employees/contractors; no encryption mandate beyond standard transport |
| **Confidential** | Sensitive business or customer data; disclosure could cause harm | Encrypted in transit (TLS) and at rest where feasible; access limited to roles that need it |
| **Restricted** | Highest sensitivity — credentials, encryption keys, raw authentication material | Encrypted at rest, access limited to the minimum systems/people necessary, never logged in plaintext |

## 3. Classification of actual data in this system

| Data | Classification | Notes |
|---|---|---|
| Marketing site content | Public | N/A |
| Internal engineering docs (this policy set, architecture notes) | Internal | Repository access-controlled |
| Customer account data (name, email) | Confidential | `users` table |
| Call recordings and transcripts | Confidential | May contain end-customer PII spoken during calls |
| Booking/CRM data entered by customers | Confidential | Organization-scoped |
| Audit events | Confidential | Contains actor/action history, used for security investigations |
| Session tokens | Restricted | Server-side only, `httpOnly` cookie, never exposed to client JS |
| OAuth/provider tokens | Restricted | Encrypted at rest with AES-256-GCM (`token-encryption.ts`) |
| Password hashes | Restricted | Never stored or logged in plaintext |
| `TOKEN_ENCRYPTION_KEY`, `HEALTH_CHECK_TOKEN`, DB credentials, SSH keys | Restricted | GitHub Actions environment secrets only, never in source control or chat |
| Billing/payment metadata | Restricted | Raw card data never touches Vyntrise systems — handled by Stripe directly |

## 4. Handling rules by level

- **Restricted** data must never appear in application logs, error-tracking payloads (Sentry), or be pasted into chat/tickets. Where a value must be shared for operational reasons (e.g., rotating a key), it is exchanged directly between systems, not through a human-readable channel.
- **Confidential** data is scoped to the organization/user it belongs to at the database query level — cross-organization access is a defect, not a feature, and should be treated as a security bug if found.
- Data classification determines the applicable retention rule in the [Data Retention & Deletion Policy](./data-retention-deletion-policy.md) and the access rule in the [Access Control Policy](./access-control-policy.md).

## 5. New data types

When a new feature introduces a new category of stored data, classify it against §2 before shipping, and update the table in §3.
