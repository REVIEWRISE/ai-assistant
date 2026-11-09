import Link from "next/link";

const STEPS = [
  {
    title: "Connect your channels in under 5 minutes",
    body: "Link your Google Business profile, Yelp account, calendars (Google / Outlook / Calendly), and messaging touchpoints with secure native OAuth.",
    bullets: ["Zero coding required", "No migration or workflow disruption", "Keeps all your existing tools intact"],
  },
  {
    title: "Set brand tone, rules, and escalation thresholds",
    body: "Train the agent on your specific offerings, pricing, and voice. Set automatic human-in-the-loop approval triggers for low-star reviews or VIP leads.",
    bullets: ["Custom tone of voice tuning", "Smart negative feedback routing", "Manager review queue with 1-click approvals"],
  },
  {
    title: "Launch 24/7 automation with full visibility",
    body: "Agents immediately begin qualifying leads, answering reviews in seconds, and scheduling appointments while you monitor performance from one clean dashboard.",
    bullets: ["Instant sub-minute response times", "Live activity logs & audit trail", "Weekly ROI and hours saved reports"],
  },
] as const;

export function LandingPlaybookSection({
  registerHref,
  isLoggedIn,
}: {
  registerHref: string;
  isLoggedIn: boolean;
}) {
  return (
    <section id="playbook" className="lp-section">
      <div className="lp-wrap grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2 className="lp-h2">Live in 15 minutes. Smarter every single week.</h2>
          <p className="lp-lede mt-5 max-w-lg">
            No complex migrations or software replacements. VyntRise sits quietly alongside your existing platforms and
            begins saving hours on day one.
          </p>

          <Link href={registerHref} className="lp-btn lp-btn-solid mt-8">
            {isLoggedIn ? "Open dashboard" : "Build your first workflow"}
          </Link>

          <dl className="mt-12 grid max-w-sm grid-cols-2 gap-6 border-t border-[var(--color-border)] pt-6">
            <div className="flex flex-col-reverse">
              <dt className="mt-1.5 text-sm text-[var(--color-text-muted)]">Initial onboarding time</dt>
              <dd className="text-3xl font-semibold tracking-[-0.03em] text-[var(--lp-accent)]">12 mins</dd>
            </div>
            <div className="flex flex-col-reverse">
              <dt className="mt-1.5 text-sm text-[var(--color-text-muted)]">Faster review turnaround</dt>
              <dd className="text-3xl font-semibold tracking-[-0.03em] text-[var(--lp-accent)]">+42%</dd>
            </div>
          </dl>
        </div>

        <ol>
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="grid grid-cols-[3rem_1fr] gap-x-4 border-t border-[var(--color-border)] py-9 first:border-t-0 first:pt-0 last:pb-0 sm:grid-cols-[5rem_1fr]"
            >
              <span className="text-[2.5rem] font-semibold leading-none tracking-[-0.04em] text-[var(--lp-accent)] sm:text-[3.5rem]">
                {index + 1}
              </span>
              <div>
                <h3 className="text-xl font-semibold leading-snug tracking-[-0.02em] text-[var(--color-text)] sm:text-[1.375rem]">
                  {step.title}
                </h3>
                <p className="mt-3 text-[15px] leading-7 text-[var(--color-text-muted)]">{step.body}</p>
                <ul className="mt-4 space-y-1.5 text-sm leading-6 text-[var(--color-text)]">
                  {step.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
