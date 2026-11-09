const TESTIMONIALS = [
  {
    name: "Helen T.",
    role: "Owner, Habesha Food",
    initials: "HT",
    metric: "8 hrs/week saved on reviews",
    quote:
      "Our inbox used to pile up after busy weekends. Now review replies and catering inquiries get drafted and published within 2 minutes. Our regulars and new guests definitely notice the speed.",
  },
  {
    name: "Liya A.",
    role: "Founder, Liya Cookies",
    initials: "LA",
    metric: "0 missed holiday orders",
    quote:
      "Pre-order and custom holiday messages finally stay organized in one place. We respond faster during peak rushes without our team being glued to smartphones all day.",
  },
  {
    name: "Samuel K.",
    role: "Manager, Nazaret Market",
    initials: "SK",
    metric: "95% routine inquiries automated",
    quote:
      "Shoppers ask about inventory, specials, and operating hours all day. The agent handles routine questions accurately so our team stays focused on helping shoppers in the aisles.",
  },
];

function Author({ item }: { item: (typeof TESTIMONIALS)[number] }) {
  return (
    <footer className="mt-6 flex items-center gap-3">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--lp-solid)] text-sm font-semibold text-white">
        {item.initials}
      </span>
      <span>
        <cite className="block text-[15px] font-semibold not-italic text-[var(--color-text)]">{item.name}</cite>
        <span className="block text-sm text-[var(--color-text-muted)]">{item.role}</span>
      </span>
    </footer>
  );
}

export function LandingTestimonialsSection() {
  const [featured, ...others] = TESTIMONIALS;

  return (
    <section id="testimonials" className="lp-section border-t border-[var(--color-border)]">
      <div className="lp-wrap">
        <h2 className="lp-h2 max-w-2xl">Real outcomes from busy local operators.</h2>

        <div className="mt-12 grid gap-12 lg:mt-16 lg:grid-cols-[1.2fr_0.8fr] lg:gap-20">
          <blockquote>
            <p className="text-[clamp(1.375rem,2.5vw,2rem)] font-medium leading-[1.4] tracking-[-0.02em] text-[var(--color-text)]">
              &ldquo;{featured.quote}&rdquo;
            </p>
            <Author item={featured} />
            <p className="mt-8 border-t border-[var(--color-border)] pt-5 text-lg font-semibold text-[var(--lp-accent)]">
              {featured.metric}
            </p>
          </blockquote>

          <div className="divide-y divide-[var(--color-border)]">
            {others.map((item) => (
              <blockquote key={item.name} className="py-8 first:pt-0 last:pb-0">
                <p className="text-base font-semibold text-[var(--lp-accent)]">{item.metric}</p>
                <p className="mt-3 text-[15px] leading-7 text-[var(--color-text)]">&ldquo;{item.quote}&rdquo;</p>
                <Author item={item} />
              </blockquote>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
