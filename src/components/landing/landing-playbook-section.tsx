import Link from "next/link";

const STEPS = [
  {
    number: "01",
    title: "Connect your channels",
    body: "Link review platforms, calendars, and customer touchpoints without replacing the tools your team already uses.",
  },
  {
    number: "02",
    title: "Set the rules once",
    body: "Choose your tone, availability, approval rules, and the moments that should always reach a person.",
  },
  {
    number: "03",
    title: "Launch and improve",
    body: "Let agents handle routine work while your team monitors activity, outcomes, and exceptions from one workspace.",
  },
] as const;

export function LandingPlaybookSection({ registerHref, isLoggedIn }: { registerHref: string; isLoggedIn: boolean }) {
  return (
    <section id="playbook" className="relative overflow-hidden bg-[var(--color-bg)] py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">From setup to action</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-[var(--color-text)] sm:text-4xl lg:text-5xl">
              Useful on day one. Smarter every week.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-[var(--color-text-muted)]">
              Start with one workflow, keep your existing stack, and expand when your team is ready.
            </p>
            <Link href={registerHref} className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-6 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)]">
              {isLoggedIn ? "Open workspace" : "Build your first workflow"}
              <span aria-hidden>→</span>
            </Link>
          </div>

          <ol className="relative space-y-4">
            <span className="absolute bottom-12 left-6 top-12 hidden w-px bg-[var(--color-border)] sm:block" aria-hidden />
            {STEPS.map((step) => (
              <li key={step.number} className="relative flex gap-4 rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:gap-6 sm:p-7">
                <span className="relative z-10 flex size-12 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--color-primary)_25%,var(--color-border))] bg-[var(--color-bg)] font-mono text-xs font-semibold text-[var(--color-primary-h)] shadow-sm">
                  {step.number}
                </span>
                <div className="pt-1">
                  <h3 className="text-lg font-semibold text-[var(--color-text)] sm:text-xl">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)] sm:text-base sm:leading-7">{step.body}</p>
                </div>
              </li>
            ))}

            <li className="relative overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-[linear-gradient(135deg,var(--color-primary-soft),var(--color-bg))] p-6 sm:p-8">
              <div className="grid gap-5 sm:grid-cols-3">
                {[
                  ["Reviews", "Draft, approve, publish"],
                  ["Bookings", "Qualify, schedule, remind"],
                  ["Leads", "Capture, route, follow up"],
                ].map(([title, body]) => (
                  <div key={title}>
                    <p className="text-sm font-semibold text-[var(--color-text)]">{title}</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">{body}</p>
                  </div>
                ))}
              </div>
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}
