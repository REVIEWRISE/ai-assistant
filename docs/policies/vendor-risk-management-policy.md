# Vendor and Third-Party Risk Management Policy

**Document owner:** [Security Officer name]
**Effective date:** [YYYY-MM-DD]
**Review cadence:** Annually, and before onboarding any new subprocessor that will handle customer data.

## 1. Purpose

Defines how Vyntrise evaluates and monitors third parties (subprocessors) that process data or provide infrastructure for the AI Assistant platform. Supports SOC 2 CC9.2.

## 2. Current subprocessor inventory

| Vendor | Purpose | Data exposure | Diligence status |
|---|---|---|---|
| OpenAI | LLM inference for the voice/chat agent | Conversation content, prompts | [Obtain: DPA, review OpenAI's SOC 2/security page] |
| Retell AI | Voice agent telephony/orchestration | Call audio, transcripts, phone numbers | [Obtain: SOC 2 report or equivalent, DPA] |
| Stripe / Vyntrise Billing | Payment processing | Billing/payment metadata (not raw card data — handled by Stripe directly) | [Obtain: Stripe DPA — Stripe is itself PCI-DSS Level 1 and publishes SOC reports] |
| GitHub (Actions, Container Registry) | CI/CD, source control, container image hosting | Source code, deployment secrets, build artifacts | GitHub publishes SOC 2 Type II reports |
| VPS hosting providers | Compute for staging and production environments | Full application data (whatever the app stores) | [Obtain: provider's security/compliance documentation] |
| SMTP provider | Transactional email delivery | Recipient email addresses, email content | [Identify provider and obtain documentation] |
| Sentry | Error tracking | Error context, which may include request metadata; scrub PII from error payloads where possible | Sentry publishes SOC 2 Type II reports |
| Let's Encrypt | TLS certificate issuance | Domain validation only, no customer data | N/A — public CA |

**Action required:** fill in the diligence status column and attach or link the actual DPA/SOC 2 report for each vendor with a "[Obtain...]" placeholder. This table itself, kept current, is a piece of audit evidence.

## 3. Onboarding a new vendor

Before a new subprocessor is given access to customer data or production systems:
1. Determine what data it will access and why (least data necessary).
2. Request its security documentation (SOC 2 report, ISO 27001 certificate, or equivalent) and a Data Processing Agreement if it will handle personal data.
3. Record the vendor in the inventory above.
4. If it will materially change what data leaves Vyntrise's systems, update the [Data Classification Policy](./data-classification-policy.md) and, if customer-facing, the privacy notice/terms.

## 4. Ongoing monitoring

- Review the vendor inventory at the cadence above, or immediately if a vendor discloses a breach.
- Subscribe to security/status notifications from critical vendors (hosting providers, GitHub, payment processor) where available.
- If a vendor is the source of, or a path for, a security incident, follow the notification steps in the [Incident Response Plan](./incident-response-plan.md).

## 5. Offboarding a vendor

When a vendor relationship ends: revoke its API keys/access immediately, confirm any data it held is deleted or returned per its DPA, and remove it from the active inventory (retain the record in an "inactive vendors" section for audit history rather than deleting it outright).
