"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeSwitch } from "@/components/theme-switch";
import { PRODUCT_NAME } from "@/lib/brand";

const NAV = [
  { href: "#features", label: "Platform" },
  { href: "#playbook", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#integrations", label: "Integrations" },
  { href: "#faq", label: "FAQ" },
] as const;

export function LandingHeader({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
      { rootMargin: "-25% 0px -60% 0px", threshold: [0.05, 0.2, 0.5] },
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
      <div className={`border-b transition duration-300 ${scrolled || open ? "border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-bg)_90%,transparent)] shadow-[var(--shadow-sm)] backdrop-blur-xl" : "border-transparent bg-[var(--color-bg)]/80 backdrop-blur-md"}`}>
        <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <BrandLogo
            href="/"
            primary={PRODUCT_NAME}
            secondary="AI operations"
            className="min-w-0 text-[var(--color-text)] [&_p:first-child]:text-[10px] [&_p:first-child]:font-semibold [&_p:first-child]:uppercase [&_p:first-child]:tracking-[0.18em] [&_p:first-child]:text-[var(--color-primary-h)] [&_p:last-child]:hidden [&_p:last-child]:text-xs [&_p:last-child]:font-medium [&_p:last-child]:text-[var(--color-text-muted)] sm:[&_p:last-child]:block"
          />

          <nav className="hidden items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-sm lg:flex" aria-label="Main navigation">
            {NAV.map((item) => {
              const active = activeSection === item.href;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "location" : undefined}
                  className={`relative rounded-full px-3.5 py-2 text-[13px] font-semibold transition ${active ? "bg-[var(--color-bg)] text-[var(--color-text)] shadow-sm" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"}`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <ThemeSwitch className="rounded-full" />
            <div className="hidden items-center gap-2 lg:flex">
              {isLoggedIn ? (
                <Link href="/dashboard" className="inline-flex h-10 items-center rounded-full bg-[var(--color-primary)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-h)]">
                  Open dashboard
                </Link>
              ) : (
                <>
                  <Link href="/login" className="inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]">
                    Sign in
                  </Link>
                  <Link href="/register" className="inline-flex h-10 items-center rounded-full bg-[var(--color-primary)] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-primary-h)]">
                    Start free
                  </Link>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen((current) => !current)}
              aria-label={open ? "Close navigation" : "Open navigation"}
              aria-expanded={open}
              className="inline-flex size-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] lg:hidden"
            >
              <svg viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                {open ? <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" /> : <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {open ? (
        <>
          <button type="button" aria-label="Close navigation" onClick={() => setOpen(false)} className="fixed inset-0 top-[4.5rem] bg-[color-mix(in_srgb,var(--color-text)_35%,transparent)] backdrop-blur-[2px] lg:hidden" />
          <div className="absolute inset-x-0 top-full px-3 pt-2 lg:hidden">
            <nav className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-2 shadow-[var(--shadow-lg)]" aria-label="Mobile navigation">
              {NAV.map((item) => {
                const active = activeSection === item.href;
                return (
                  <a key={item.href} href={item.href} onClick={() => setOpen(false)} className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition ${active ? "bg-[var(--color-primary-soft)] text-[var(--color-primary-h)]" : "text-[var(--color-text)] hover:bg-[var(--color-surface)]"}`}>
                    {item.label}
                    <span aria-hidden className="text-[var(--color-text-subtle)]">→</span>
                  </a>
                );
              })}
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-[var(--color-border)] p-2 pt-4">
                {isLoggedIn ? (
                  <Link href="/dashboard" onClick={() => setOpen(false)} className="col-span-2 inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-primary)] px-5 text-sm font-semibold text-white">
                    Open dashboard
                  </Link>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setOpen(false)} className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--color-border)] text-sm font-semibold text-[var(--color-text)]">Sign in</Link>
                    <Link href="/register" onClick={() => setOpen(false)} className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-semibold text-white">Start free</Link>
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
