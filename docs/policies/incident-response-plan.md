# Incident Response Plan

**Document owner:** [Security Officer name]
**Effective date:** [YYYY-MM-DD]
**Review cadence:** Annually, and after every incident that reaches Severity 2 or higher (see below), via a post-incident review.

## 1. Purpose

Defines how Vyntrise detects, contains, eradicates, and recovers from security incidents affecting the AI Assistant platform, and how affected parties are notified. Supports SOC 2 CC7.2–CC7.5.

## 2. Severity classification

| Severity | Definition | Example |
|---|---|---|
| SEV1 — Critical | Confirmed compromise of production systems, customer data breach, or full production outage | Active malware/C2 traffic on a host serving production; production down for all customers |
| SEV2 — High | Confirmed compromise or outage limited to non-production systems, or a production degradation | Malware found on staging infrastructure; partial production outage |
| SEV3 — Medium | Suspicious activity requiring investigation, no confirmed impact yet | Anomalous login pattern, unexpected process on a host |
| SEV4 — Low | Policy violation or minor issue with no security impact | Misconfigured non-production firewall rule |

## 3. Detection sources

- Sentry error tracking (server, edge, client) for application-level anomalies
- Docker health checks / container status on both environments
- SSH `auth.log` review on hosts
- Manual discovery during unrelated maintenance (see worked example below — this is how the one real incident to date was found)
- `audit_events` table for anomalous authentication patterns
- [Add once implemented: centralized log aggregation alerting, per Phase 2 of `soc2-status.md`]

## 4. Response process

1. **Identify** — confirm the event is real, classify severity per §2.
2. **Contain** — isolate the affected system (stop/disconnect the container, restrict network access, revoke credentials) without destroying evidence needed for root-cause analysis. Prefer isolation over deletion until the scope is understood.
3. **Investigate** — determine scope (what was accessed, whether it spread to other systems), root cause (how the attacker/fault got in), and duration of exposure.
4. **Eradicate** — remove the malicious artifact or fix the underlying flaw (e.g., close the exposed service, patch the vulnerability, rotate compromised credentials).
5. **Recover** — restore the affected service from a known-good state, verify normal operation before considering the incident closed.
6. **Notify** — see §6.
7. **Document** — record the incident, timeline, and remediation in an incident log (this file's companion log, or a GRC tool once adopted).
8. **Post-incident review** — for SEV1/SEV2, hold a review to identify process gaps and update this plan or related controls.

## 5. Worked example (real incident, staging environment)

This is retained as a concrete reference for how the process above applies in practice.

- **What happened:** During unrelated deployment troubleshooting, a shared staging VPS's root disk was found at 100% capacity, blocking deploys. Investigation found a container (`reviewrise-next-web`, belonging to a different product on the same shared host) had a 171GB writable layer filled with malware — disguised ELF binaries dropped into `/tmp` under names mimicking legitimate system processes (`.NetworkManager*`, `agetty*`, `watchdog-*`, `wpa_supplicant*`), with live outbound connections to two external IPs via processes hidden from `ps` but visible via `/proc`/`ss` lookups (rootkit-style process hiding).
- **Root cause:** An unrelated Redis instance on the same host was published to `0.0.0.0:6379` with no `requirepass` set — a well-documented initial-access vector for this class of cryptomining/worm malware.
- **Containment/eradication:** The affected container was removed (reclaiming the disk space). The exposed Redis instance needs `requirepass` set and/or its port binding restricted to the internal Docker network — tracked as a follow-up owned by that service's maintainers, since it was outside this system's scope.
- **Scope check:** Other containers on the same host, including all `ai-assistant` containers, were checked for the same artifact pattern and found clean — no lateral movement confirmed.
- **Lesson applied:** This is why environment separation (moving production to its own dedicated VPS, not shared with unrelated projects) was prioritized — see [Business Continuity & DR Plan](./business-continuity-dr-plan.md) §2.

## 6. Notification

- **Internal:** Security Officer and Management are notified immediately for SEV1/SEV2.
- **Customers:** [Define trigger and SLA — e.g., customers are notified within 72 hours if their data was confirmed accessed or the service they depend on had a SEV1 outage exceeding X minutes.]
- **Regulatory:** [Define applicable requirements based on jurisdictions served, e.g., breach notification laws, if customer PII is confirmed exposed.]
- **Subprocessors:** If a vendor's system is the source or path of an incident, notify them per the terms in the [Vendor & Third-Party Risk Management Policy](./vendor-risk-management-policy.md).

## 7. Roles during an incident

| Role | Responsibility |
|---|---|
| Incident Lead | Coordinates response, makes containment decisions, owns communication |
| Engineering | Executes technical containment/eradication/recovery |
| Security Officer | Confirms severity, ensures process is followed, leads post-incident review |

*(Assign named individuals — an auditor will expect this, not just role titles.)*

## 8. Incident log

Maintain a running log (date, severity, summary, root cause, remediation, closure date) for all SEV1–SEV3 incidents. This is a primary piece of evidence for a SOC 2 Type II audit.
