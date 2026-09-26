import { LANDING_TESTIMONIALS } from "@/lib/landing-data";

const TESTIMONIAL_METRICS = [
  {
    name: "Helen T.",
    role: "Owner, Habesha Food",
    avatarBg: "from-indigo-500 to-sky-500",
    initials: "HT",
    metric: "8 hrs/week saved on reviews",
    tag: "Hospitality & Catering",
    quote:
      "Our inbox used to pile up after busy weekends. Now review replies and catering inquiries get drafted and published within 2 minutes. Our regulars and new guests definitely notice the speed.",
  },
  {
    name: "Liya A.",
    role: "Founder, Liya Cookies",
    avatarBg: "from-amber-500 to-rose-500",
    initials: "LA",
    metric: "0 missed holiday orders",
    tag: "Artisanal Bakery & Retail",
    quote:
      "Pre-order and custom holiday messages finally stay organized in one place. We respond faster during peak rushes without our team being glued to smartphones all day.",
  },
  {
    name: "Samuel K.",
    role: "Manager, Nazaret Market",
    avatarBg: "from-emerald-500 to-teal-500",
    initials: "SK",
    metric: "95% routine inquiries automated",
    tag: "Specialty Grocery",
    quote:
      "Shoppers ask about inventory, specials, and operating hours all day. The agent handles routine questions accurately so our team stays focused on helping shoppers in the aisles.",
  },
];

export function LandingTestimonialsSection() {
  return (
    <section id="testimonials" className="relative overflow-hidden bg-[var(--color-surface)]/50 py-24 sm:py-32 border-b border-[var(--color-border)]">
      {/* Background atmosphere */}
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-[0.06]" aria-hidden />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="vr-landing-eyebrow">
            <span>Customer Stories</span>
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-[var(--color-text)] sm:text-4xl lg:text-5xl">
            Real outcomes from <span className="vr-gradient-text">busy local operators.</span>
          </h2>
          <p className="mt-4 text-base text-[var(--color-text-muted)]">
            See how small and medium businesses save time and drive higher review scores with VyntRise.
          </p>
        </div>

        {/* Testimonials Cards Grid */}
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {TESTIMONIAL_METRICS.map((item) => (
            <div
              key={item.name}
              className="vr-glass-card group flex flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-7 sm:p-8 transition"
            >
              <div>
                {/* Header: Stars & Metric Pill */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-1 text-amber-500 text-sm">
                    {"★★★★★"}
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    {item.metric}
                  </span>
                </div>

                {/* Quote */}
                <p className="mt-6 text-sm leading-relaxed text-[var(--color-text)] font-medium italic">
                  &ldquo;{item.quote}&rdquo;
                </p>
              </div>

              {/* Author Footer */}
              <div className="mt-8 flex items-center gap-3.5 border-t border-[var(--color-border)] pt-5">
                <div
                  className={`flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr ${item.avatarBg} text-xs font-bold text-white shadow-sm`}
                >
                  {item.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-bold text-[var(--color-text)]">{item.name}</p>
                    <span className="text-emerald-500 text-xs" title="Verified Customer">✓</span>
                  </div>
                  <p className="truncate text-xs text-[var(--color-text-muted)]">{item.role}</p>
                  <p className="text-[10px] text-[var(--color-primary-h)] font-semibold">{item.tag}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
