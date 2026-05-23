"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { PRODUCT_NAME } from "@/lib/brand";
import { useEffect, useState } from "react";

const NAV = [
  { href: "#features", label: "Features" },
  { href: "#playbook", label: "How it works" },
  { href: "#integrations", label: "Integrations" },
  { href: "#pricing", label: "Pricing" },
  { href: "#contact", label: "Contact" },
] as const;

export function LandingHeader({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-50">
      <div className="relative">
        <div
          className={`relative z-50 border-b transition-[border-color,background-color,box-shadow,backdrop-filter] duration-300 ease-out ${
            scrolled
              ? "border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-bg)_88%,transparent)] shadow-[var(--shadow-sm)] backdrop-blur-xl backdrop-saturate-150"
              : "border-transparent bg-transparent shadow-none backdrop-blur-none"
          }`}
        >
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 py-3 min-[400px]:gap-3 sm:gap-4 sm:px-6 sm:py-3.5">
            <BrandLogo
              href="/"
              primary={PRODUCT_NAME}
              secondary="Customer-facing automation"
              className="min-w-0 pr-1 text-[var(--color-text)] [&_p:first-child]:text-[10px] [&_p:first-child]:font-semibold [&_p:first-child]:uppercase [&_p:first-child]:tracking-[0.2em] [&_p:first-child]:text-[var(--color-primary-h)] [&_p:last-child]:hidden [&_p:last-child]:text-sm [&_p:last-child]:font-semibold [&_p:last-child]:text-[var(--color-text)] [&_p:last-child]:normal-case [&_p:last-child]:tracking-normal sm:[&_p:last-child]:block"
              linkClassName="transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
            />

            <nav
              className="vr-landing-glass-nav isolate hidden rounded-full p-1 shadow-[var(--shadow-md)] lg:flex"
              aria-label="Page sections"
            >
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-full px-3.5 py-2 text-sm font-medium text-[var(--color-text-muted)] outline-none transition-colors hover:bg-[var(--color-bg)]/60 hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden items-center gap-2 lg:flex">
                {isLoggedIn ? (
                  <Link
                    href="/dashboard"
                    className="vr-landing-btn-primary rounded-full px-4 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
                  >
                    Dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="vr-landing-btn-secondary px-4 py-2 text-sm shadow-sm outline-none"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/register"
                      className="vr-landing-btn-primary rounded-full px-4 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
                    >
                      Start free
                    </Link>
                  </>
                )}
              </div>
              <button
                type="button"
                aria-label={open ? "Close menu" : "Open menu"}
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border text-[var(--color-text)] outline-none transition lg:hidden ${
                  open
                    ? "border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] shadow-inner"
                    : "border-[var(--color-border)] bg-[var(--color-bg)]/70 shadow-sm backdrop-blur-md hover:border-[var(--color-border-hover)] hover:bg-[var(--color-bg)]"
                } focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2`}
              >
                <span className="relative h-4 w-4">
                  <svg
                    className={`absolute inset-0 transition duration-200 ${open ? "scale-90 opacity-0" : "scale-100 opacity-100"}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden
                  >
                    <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
                  </svg>
                  <svg
                    className={`absolute inset-0 transition duration-200 ${open ? "scale-100 opacity-100" : "scale-90 opacity-0"}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden
                  >
                    <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </div>

        {open ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 bg-[color-mix(in_srgb,var(--color-text)_35%,transparent)] backdrop-blur-[2px] lg:hidden"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            />
            <div className="absolute left-0 right-0 top-full z-50 px-3 pt-2 lg:hidden">
              <nav
                className="vr-landing-glass-nav mx-auto max-w-6xl overflow-hidden rounded-2xl p-2 shadow-[var(--shadow-lg)] backdrop-blur-2xl backdrop-saturate-150"
                aria-label="Mobile"
              >
                <div className="flex flex-col gap-0.5">
                  {NAV.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between rounded-xl px-4 py-3 text-[15px] font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-bg)]/80 active:bg-[var(--color-surface)]"
                    >
                      {item.label}
                      <svg
                        className="h-4 w-4 text-[var(--color-text-subtle)]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden
                      >
                        <path strokeLinecap="round" d="m9 18 6-6-6-6" />
                      </svg>
                    </a>
                  ))}
                </div>
                <div className="mt-2 border-t border-[var(--color-border)] pt-2">
                  {isLoggedIn ? (
                    <Link
                      href="/dashboard"
                      onClick={() => setOpen(false)}
                      className="vr-landing-btn-primary flex w-full items-center justify-center rounded-xl py-3.5 text-sm font-semibold"
                    >
                      Go to dashboard
                    </Link>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href="/login"
                        onClick={() => setOpen(false)}
                        className="vr-landing-btn-secondary flex items-center justify-center rounded-xl py-3.5 text-sm font-semibold"
                      >
                        Sign in
                      </Link>
                      <Link
                        href="/register"
                        onClick={() => setOpen(false)}
                        className="vr-landing-btn-primary flex items-center justify-center rounded-xl py-3.5 text-sm font-semibold"
                      >
                        Start free
                      </Link>
                    </div>
                  )}
                </div>
              </nav>
            </div>
          </>
        ) : null}
      </div>
    </header>
  );
}
