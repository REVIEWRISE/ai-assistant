"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Shared building blocks for long settings tabs (Voice agent setup, Phone lines, Call history):
 * a sticky left menu with per-section status, and section cards with an icon header + status chip.
 */

export type SectionTone = "success" | "warning" | "neutral";
export type SectionStatus = { label: string; tone: SectionTone };

export const SECTION_STATUS_DOT: Record<SectionTone, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  neutral: "bg-[var(--color-text-subtle)]",
};

export function scrollToSectionId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** Line-icon helper: pass the SVG path data for a 24×24 stroke icon. */
export function SectionGlyph({ paths, className = "size-4" }: { paths: string[]; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

export function SectionStatusChip({ status }: { status: SectionStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-muted)]">
      <span className={`size-1.5 rounded-full ${SECTION_STATUS_DOT[status.tone]}`} aria-hidden />
      {status.label}
    </span>
  );
}

/** The shaded header strip at the top of a section card. */
export function SectionHeaderStrip({
  icon,
  title,
  description,
  status,
  badge,
  actions,
}: {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  status?: SectionStatus;
  badge?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-5 py-3.5 lg:px-6">
      <div className="flex min-w-0 flex-[1_1_16rem] items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary-h)] shadow-[var(--shadow-sm)]">
          {icon}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold tracking-[-0.01em] text-[var(--color-text)]">{title}</h4>
            {badge}
          </div>
          {description ? <div className="text-xs leading-5 text-[var(--color-text-muted)]">{description}</div> : null}
        </div>
      </div>
      {status || actions ? (
        <div className="flex flex-wrap items-center gap-2">
          {status ? <SectionStatusChip status={status} /> : null}
          {actions}
        </div>
      ) : null}
    </div>
  );
}

/** A full section card: anchor id for the menu, header strip, and body. */
export function SectionPanel({
  id,
  bodyClassName = "space-y-4 p-5 lg:p-6",
  children,
  ...header
}: {
  id: string;
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  status?: SectionStatus;
  badge?: ReactNode;
  actions?: ReactNode;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-28 overflow-hidden rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]"
    >
      <SectionHeaderStrip {...header} />
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export type SectionMenuItem = { id: string; label: string; icon: ReactNode; status?: SectionStatus };

/** Sticky in-page menu (desktop only) that highlights the section in view and scrolls on click. */
export function SectionMenu({ items, ariaLabel }: { items: SectionMenuItem[]; ariaLabel: string }) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  // After a click, keep the clicked item highlighted while the smooth scroll runs: sections near the end
  // can't reach the top of the screen, so the scroll tracker would otherwise pick the one above.
  const clickLockUntil = useRef(0);
  const idsKey = items.map((item) => item.id).join("|");

  useEffect(() => {
    const elements = idsKey
      .split("|")
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const id = visible[0]?.target.id;
        if (id && Date.now() > clickLockUntil.current) setActive(id);
      },
      { rootMargin: "-15% 0px -60% 0px" },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [idsKey]);

  return (
    <nav aria-label={ariaLabel} className="hidden lg:sticky lg:top-4 lg:block">
      <ul className="space-y-1 rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-[var(--shadow-sm)]">
        {items.map((item) => {
          const isActive = active === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  clickLockUntil.current = Date.now() + 1200;
                  setActive(item.id);
                  scrollToSectionId(item.id);
                }}
                aria-current={isActive ? "true" : undefined}
                className={`flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition ${
                  isActive ? "bg-[var(--color-primary-soft)]" : "hover:bg-[var(--color-bg)]"
                }`}
              >
                <span className={`mt-0.5 ${isActive ? "text-[var(--color-primary-h)]" : "text-[var(--color-text-muted)]"}`}>
                  {item.icon}
                </span>
                <span className="min-w-0">
                  <span
                    className={`block text-xs font-semibold ${isActive ? "text-[var(--color-primary-h)]" : "text-[var(--color-text)]"}`}
                  >
                    {item.label}
                  </span>
                  {item.status ? (
                    <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
                      <span className={`size-1.5 shrink-0 rounded-full ${SECTION_STATUS_DOT[item.status.tone]}`} aria-hidden />
                      <span className="truncate">{item.status.label}</span>
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Two-column page frame: menu on the left (desktop), sections on the right. */
export function SectionLayout({ menu, children }: { menu: ReactNode; children: ReactNode }) {
  return (
    <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start lg:gap-5">
      {menu}
      <div className="min-w-0 space-y-4">{children}</div>
    </div>
  );
}

/** Icon path sets used by the Voice Support tabs. */
export const SECTION_ICONS = {
  phone: [
    "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z",
  ],
  forwarding: ["M17 1l4 4-4 4", "M3 11V9a4 4 0 0 1 4-4h14", "M7 23l-4-4 4-4", "M21 13v2a4 4 0 0 1-4 4H3"],
  add: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M12 8v8M8 12h8"],
  history: ["M3 12a9 9 0 1 0 3-6.7L3 8", "M3 3v5h5", "M12 7v5l3 2"],
  stats: ["M3 3v18h18", "M7 15l4-4 3 3 5-6"],
} as const;
