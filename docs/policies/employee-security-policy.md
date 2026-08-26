# Employee Security Policy

**Document owner:** [Security Officer name]
**Effective date:** [YYYY-MM-DD]
**Review cadence:** Annually.

## 1. Purpose

Defines the security expectations for employees and contractors who work on or have access to the AI Assistant platform. Supports SOC 2 CC1.4 (competence) and CC6.1–CC6.3 (access lifecycle).

## 2. Onboarding

Before a new employee or contractor is granted any access:
1. [Define: background check requirement, if any, proportionate to the access level being granted.]
2. Sign an acceptable-use / confidentiality agreement covering handling of Confidential and Restricted data (see [Data Classification Policy](./data-classification-policy.md)).
3. Complete security awareness training (see §4) before receiving production access.
4. Access is provisioned per the [Access Control Policy](./access-control-policy.md) on a least-privilege basis for their role — not by default granted Admin or infrastructure access.

## 3. Offboarding

When an employee or contractor's engagement ends, or their role changes such that access is no longer needed:
1. Revoke application role assignments and disable the account (§2.3 of the [Access Control Policy](./access-control-policy.md)).
2. Rotate or revoke any shared credentials/keys they had access to (SSH keys added to `authorized_keys`, GitHub repository access, GHCR PAT if personal, etc.).
3. Remove them from any communication channels with access to Confidential/Restricted information.
4. [Define SLA — e.g., within 24 hours of the offboarding trigger.]

## 4. Security awareness training

All personnel with access to Confidential or Restricted data complete security awareness training:
- At onboarding, before production access is granted.
- [Define recurring cadence — e.g., annually.]
- Training should cover: phishing/social engineering awareness, secure handling of credentials (never share passwords/keys over chat — this is enforced practice already, see [Access Control Policy](./access-control-policy.md) §3.1), the data classification levels, and how to report a suspected incident (see [Incident Response Plan](./incident-response-plan.md)).

Training completion is recorded and retained as audit evidence.

## 5. Acceptable use

- Company/customer systems and data are used only for legitimate business purposes.
- Credentials are never shared between individuals; each person uses their own account/key.
- Personal devices used to access production systems or Confidential/Restricted data must have disk encryption and a screen lock enabled. [Extend with any additional device requirements as headcount grows.]
- Suspected security issues (phishing attempt, lost device, accidental credential exposure) are reported immediately per the [Incident Response Plan](./incident-response-plan.md) — early reporting is treated as a positive action, not a fault.

## 6. Remote work

[Define any requirements specific to remote access — e.g., VPN use, prohibition on accessing production from unmanaged public devices.]
