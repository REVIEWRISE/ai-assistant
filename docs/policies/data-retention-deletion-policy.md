# Data Retention and Deletion Policy

**Document owner:** [Security Officer name]
**Effective date:** [YYYY-MM-DD]
**Review cadence:** Annually, and on any change to what data is collected.

## 1. Purpose

Defines how long Vyntrise retains different categories of data and how it is deleted when no longer needed. Supports SOC 2 CC6.5 and, where applicable, data-minimization expectations under privacy regulations.

## 2. Data inventory and retention

| Data type | Table(s) | Retention | Deletion trigger |
|---|---|---|---|
| User account data | `users` | Life of the account | Account deletion request or organization offboarding |
| Session tokens | `sessions` | Until expiry (`expires_at`) or logout | Automatic expiry; explicit deletion on logout |
| OAuth/provider tokens | `provider_connections.token_data` (encrypted at rest) | Life of the provider connection | Provider disconnect |
| Audit/security events | `audit_events` | [Define — commonly 1 year minimum for SOC 2 evidence] | Time-based purge after retention period |
| Call recordings/transcripts | `retell_call` and related tables | [Define based on business need and any telephony recording consent requirements] | Time-based purge, or customer deletion request |
| Booking/CRM data entered by customers | Organization-scoped tables | Life of the organization's subscription, or as contractually agreed | Organization offboarding |
| Billing/subscription metadata | `organizations` (billing fields) | [Define — often retained longer for financial record-keeping requirements] | Per applicable financial record-keeping rules |
| Knowledge base content | `organization_knowledge_base` | Life of the organization | Organization offboarding or explicit deletion |
| Database backups | Off-host storage (see [BC/DR Plan](./business-continuity-dr-plan.md)) | [Define — commonly matches or slightly exceeds RPO-driven backup frequency, e.g., 30 days rolling] | Automatic rotation |

**Action required:** the bracketed items are business/legal decisions, not technical ones — fill them in with actual values (ideally informed by what customer contracts promise and any regulatory requirements for the jurisdictions served), then keep this table as the single source of truth.

## 3. Deletion procedure

- Account/organization deletion cascades through foreign-key relationships already defined in the schema (`onDelete: Cascade` on most child tables) — verify this produces a complete deletion when a customer requests it, including provider tokens and knowledge base content.
- For data with a defined retention period rather than an event-based trigger (e.g., audit events, call recordings), implement a scheduled purge job once the retention values above are finalized. Not yet implemented — track as a follow-up.
- Deletion from backups happens naturally through backup rotation (§2) rather than selective deletion within a backup archive.

## 4. Customer data export/deletion requests

[Define the process for handling a customer's request to export or delete their data — who receives the request, the SLA to fulfill it, and how fulfillment is verified and recorded.]

## 5. Legal holds

If data must be preserved beyond its normal retention period (e.g., for a legal dispute or ongoing security investigation), the Security Officer records the hold, the reason, and the systems affected, and ensures routine deletion jobs skip the held data until the hold is lifted.
