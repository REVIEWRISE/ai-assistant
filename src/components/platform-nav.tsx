"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/platform", label: "Overview" },
  { href: "/platform/providers", label: "Providers" },
] as const;

export function PlatformNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Platform sections" className="max-w-full overflow-x-auto">
      <div className="inline-flex min-w-max gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                active
                  ? "bg-[var(--color-bg)] text-[var(--color-primary-h)] shadow-[var(--shadow-sm)] ring-1 ring-[var(--color-border)]"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
