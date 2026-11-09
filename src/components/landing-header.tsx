"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LandingLogoMark } from "@/components/landing/landing-logo-mark";
import { ThemeSwitch } from "@/components/theme-switch";
import { PRODUCT_NAME } from "@/lib/brand";
import { trackLandingNav, trackLandingCta } from "@/lib/analytics";

const NAV = [
  { href: "#features", label: "Platform" },
  { href: "#demo-playground", label: "Live Sandbox" },
  { href: "#playbook", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
] as const;

export function LandingHeader({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const solid = scrolled || open;
  const ctaClass = `lp-btn lp-btn-sm ${solid ? "lp-btn-solid" : "lp-btn-white"}`;

  useEffect(() => {
    const sync = () => setScrolled(window.scrollY > 24);
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    return () => window.removeEventListener("scroll", sync);
  }, []);

  useEffect(() => {
    // Watches every section, so links clear while a section outside the nav is on screen.
    const sections = document.querySelectorAll("main section[id]");
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
    <header className="sticky top-0 z-50 -mb-18 h-18">
      {open ? (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-[var(--color-overlay)] lg:hidden"
        />
      ) : null}

      <div className="lp-wrap flex h-full items-center">
        <div className="lp-bar flex items-center justify-between gap-4 lg:grid lg:grid-cols-[1fr_auto_1fr]" data-solid={solid}>
          <Link href="/" className="lp-bar-logo flex min-w-0 items-center gap-2.5 justify-self-start rounded-full">
            <LandingLogoMark className="h-7 w-auto shrink-0" />
            <span className="truncate text-[15px] font-semibold tracking-[-0.02em]">{PRODUCT_NAME}</span>
          </Link>

          <nav className="hidden items-center gap-8 lg:flex" aria-label="Main navigation">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => trackLandingNav(item.label, item.href)}
                aria-current={activeSection === item.href ? "location" : undefined}
                className="lp-bar-link"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2 justify-self-end sm:gap-3">
            <ThemeSwitch className="lp-bar-icon" />

            <div className="hidden items-center gap-3 sm:flex">
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  onClick={() => trackLandingCta("Header Dashboard", "header", "/dashboard")}
                  className={ctaClass}
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => trackLandingCta("Header Sign In", "header", "/login")}
                    className="lp-bar-link"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => trackLandingCta("Header Start Free", "header", "/register")}
                    className={ctaClass}
                  >
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
              className="lp-bar-icon inline-flex size-9 items-center justify-center lg:hidden"
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

          {open ? (
            <nav
              className="absolute -inset-x-2.5 top-full mt-2 rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3 shadow-xl lg:hidden"
              aria-label="Mobile navigation"
            >
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    setOpen(false);
                    trackLandingNav(item.label, item.href);
                  }}
                  className="flex min-h-12 items-center rounded-2xl px-3 text-base font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--lp-tint)]"
                >
                  {item.label}
                </a>
              ))}

              <div className="mt-2 grid gap-2 border-t border-[var(--color-border)] pt-3">
                {isLoggedIn ? (
                  <Link
                    href="/dashboard"
                    onClick={() => {
                      setOpen(false);
                      trackLandingCta("Mobile Dashboard", "mobile_header", "/dashboard");
                    }}
                    className="lp-btn lp-btn-solid w-full"
                  >
                    Open dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/register"
                      onClick={() => {
                        setOpen(false);
                        trackLandingCta("Mobile Start Free Trial", "mobile_header", "/register");
                      }}
                      className="lp-btn lp-btn-solid w-full"
                    >
                      Start 14-day free trial
                    </Link>
                    <Link
                      href="/login"
                      onClick={() => {
                        setOpen(false);
                        trackLandingCta("Mobile Sign In", "mobile_header", "/login");
                      }}
                      className="lp-btn lp-btn-outline w-full"
                    >
                      Sign in
                    </Link>
                  </>
                )}
              </div>
            </nav>
          ) : null}
        </div>
      </div>
    </header>
  );
}
