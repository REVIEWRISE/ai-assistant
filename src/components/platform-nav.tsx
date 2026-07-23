"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function PlatformNav({ showBilling }: { showBilling: boolean }) {
  const pathname = usePathname();
  const items = [
    { href: "/platform", label: "Overview" },
    { href: "/platform/providers", label: "Providers" },
    ...(showBilling
      ? [{ href: "/platform/billing-plans", label: "Billing plans" }]
      : []),
  ];

  return (
    <nav aria-label="Platform sections" className="max-w-full overflow-x-auto">
      <div className="inline-flex min-w-max gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
        {items.map((item) => {
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
