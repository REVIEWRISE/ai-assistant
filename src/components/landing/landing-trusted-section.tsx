const CATEGORIES: Record<string, string> = {
  "Habesha Food": "Hospitality",
  "Liya Cookies": "Bakery & Retail",
  "Nazaret Market": "Grocery",
};

const STATS = [
  { value: "250k+", label: "Messages handled" },
  { value: "< 2 min", label: "Avg response time" },
  { value: "99.4%", label: "Automation accuracy" },
  { value: "35 hrs", label: "Saved per location / mo" },
];

export function LandingTrustedSection({ names = [] }: { names?: readonly string[] }) {
  return (
    <section id="trusted" className="border-b border-[var(--color-border)]">
      <div className="lp-wrap py-12 sm:py-16">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
          {STATS.map(({ value, label }) => (
            <div key={label} className="flex flex-col-reverse">
              <dt className="mt-2.5 text-sm text-[var(--color-text-muted)]">{label}</dt>
              <dd className="text-[clamp(2rem,4vw,3rem)] font-semibold leading-none tracking-[-0.03em] text-[var(--lp-accent)]">
                {value}
              </dd>
            </div>
          ))}
        </dl>

        {names.length > 0 ? (
          <p className="mt-10 border-t border-[var(--color-border)] pt-6 text-sm leading-7 text-[var(--color-text-muted)]">
            Trusted by{" "}
            {names.map((name, index) => (
              <span key={name}>
                {index > 0 ? ", " : null}
                <span className="font-semibold text-[var(--color-text)]">{name}</span>
                {CATEGORIES[name] ? ` (${CATEGORIES[name]})` : null}
              </span>
            ))}{" "}
            and 150+ local teams.
          </p>
        ) : null}
      </div>
    </section>
  );
}
