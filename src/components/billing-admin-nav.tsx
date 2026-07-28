"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/billing-admin", label: "Overview" },
  { href: "/billing-admin/organizations", label: "Organizations" },
  { href: "/billing-admin/plans", label: "Plans" },
] as const;

export function BillingAdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Billing admin sections" className="max-w-full overflow-x-auto">
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
