"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeSwitch } from "@/components/theme-switch";
import { PRODUCT_NAME } from "@/lib/brand";

const NAV = [
  { href: "#features", label: "Platform" },
  { href: "#demo-playground", label: "Live Sandbox" },
  { href: "#playbook", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#integrations", label: "Integrations" },
  { href: "#testimonials", label: "Stories" },
  { href: "#faq", label: "FAQ" },
] as const;

export function LandingHeader({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const sync = () => setScrolled(window.scrollY > 8);
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    return () => window.removeEventListener("scroll", sync);
  }, []);

  useEffect(() => {
    const sections = NAV.map((item) => document.querySelector(item.href)).filter(Boolean) as Element[];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActiveSection(`#${visible.target.id}`);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0.05, 0.2, 0.5] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50">
      <div
        className={`border-b transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ease-out ${
          scrolled || open
            ? "border-[var(--color-border)] bg-[var(--color-bg)]/88 shadow-[0_1px_12px_0_rgb(0_0_0/0.06)] backdrop-blur-xl"
            : "border-transparent bg-transparent shadow-none backdrop-blur-none"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          <BrandLogo
            href="/"
            size="sm"
            primary={PRODUCT_NAME}
            secondary="Autonomous AI Ops"
            className="min-w-0 shrink-0 text-[var(--color-text)] [&_p:first-child]:text-[13px] [&_p:first-child]:font-bold [&_p:first-child]:tracking-[-0.02em] [&_p:first-child]:text-[var(--color-text)] [&_p:last-child]:hidden [&_p:last-child]:text-[10px] [&_p:last-child]:font-semibold [&_p:last-child]:text-[var(--color-primary-h)] sm:[&_p:last-child]:block"
          />

          {/* Desktop Navigation */}
          <nav
            className="hidden items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-3 py-1.5 shadow-sm backdrop-blur lg:flex"
            aria-label="Main navigation"
          >
            {NAV.map((item) => {
              const active = activeSection === item.href;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "location" : undefined}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-sm"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <ThemeSwitch className="size-9 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] shadow-none hover:bg-[var(--color-raised)]" />

            <div className="hidden items-center gap-3 sm:flex">
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className="vr-landing-btn-primary inline-flex h-9 items-center rounded-full px-4 text-xs font-bold text-[var(--color-primary-fg)] shadow"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-xs font-bold text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="vr-landing-btn-primary inline-flex h-9 items-center rounded-full px-4 text-xs font-bold text-[var(--color-primary-fg)] shadow"
                  >
                    Start Free
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setOpen((current) => !current)}
              aria-label={open ? "Close navigation" : "Open navigation"}
              aria-expanded={open}
              className="inline-flex size-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] transition hover:bg-[var(--color-raised)] lg:hidden"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                {open ? (
                  <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
                ) : (
                  <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {open ? (
        <>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="fixed inset-0 top-16 bg-[var(--color-overlay)] backdrop-blur-[4px] lg:hidden"
          />
          <div className="absolute inset-x-0 top-full px-4 pt-3 lg:hidden">
            <nav
              className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3 shadow-xl"
              aria-label="Mobile navigation"
            >
              {NAV.map((item) => {
                const active = activeSection === item.href;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                      active
                        ? "bg-[var(--color-primary-soft)] text-[var(--color-primary-h)]"
                        : "text-[var(--color-text)] hover:bg-[var(--color-surface)]"
                    }`}
                  >
                    {item.label}
                  </a>
                );
              })}

              <div className="mt-2 space-y-2 border-t border-[var(--color-border)] pt-3">
                {isLoggedIn ? (
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className="vr-landing-btn-primary flex min-h-11 w-full items-center justify-center rounded-full text-xs font-bold text-[var(--color-primary-fg)] shadow"
                  >
                    Open dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/register"
                      onClick={() => setOpen(false)}
                      className="vr-landing-btn-primary flex min-h-11 w-full items-center justify-center rounded-full text-xs font-bold text-[var(--color-primary-fg)] shadow"
                    >
                      Start 14-Day Free Trial
                    </Link>
                    <Link
                      href="/login"
                      onClick={() => setOpen(false)}
                      className="flex min-h-10 w-full items-center justify-center text-xs font-bold text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
                    >
                      Sign In to Existing Account
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        </>
      ) : null}
    </header>
  );
}
