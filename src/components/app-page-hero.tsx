import type { ReactNode } from "react";

type AppPageHeroProps = {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
};

/** In-app page hero — dark VyntRise band with landing-style eyebrow and primary mesh glow. */
export function AppPageHero({ eyebrow, title, description, children }: AppPageHeroProps) {
  return (
    <section className="vr-app-hero relative overflow-hidden p-5 lg:p-6">
      <div className="landing-dark-mesh pointer-events-none absolute inset-0 opacity-90" aria-hidden />
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_srgb,var(--color-primary)_35%,transparent),transparent)] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_srgb,var(--color-grad-start)_22%,transparent),transparent)] blur-3xl"
        aria-hidden
      />
      <div className="relative">
        <div className="vr-landing-eyebrow-dark w-fit">{eyebrow}</div>
        <h1 className="mt-4 text-2xl font-semibold leading-tight tracking-tight text-white lg:mt-5 lg:text-3xl">
          {title}
        </h1>
        {description ? (
          <div className="vr-app-hero-muted mt-3 max-w-2xl text-sm leading-relaxed lg:text-base">{description}</div>
        ) : null}
        {children}
      </div>
    </section>
  );
}

export function AppPageHeroBadge({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100">
      {children}
    </p>
  );
}

export function AppPageHeroStatGrid({
  children,
  columns = "3",
}: {
  children: ReactNode;
  columns?: "2" | "3" | "4";
}) {
  const colsClass =
    columns === "4"
      ? "sm:grid-cols-2 xl:grid-cols-4"
      : columns === "2"
        ? "sm:grid-cols-2"
        : "sm:grid-cols-3";
  return <div className={`mt-4 grid gap-3 text-xs ${colsClass}`}>{children}</div>;
}

export function AppPageHeroStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2">
      <p className="text-slate-300">{label}</p>
      <p className="text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

export function AppPageHeroStatPanel({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 w-full rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur">{children}</div>
  );
}

export function AppPageHeroLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className="mt-4 inline-flex rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-fg)] transition hover:bg-[var(--color-primary-h)]"
    >
      {children}
    </a>
  );
}
