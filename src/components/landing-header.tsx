"use client";

import Link from "next/link";
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
          className={`relative z-50 border-b transition-[border-color,box-shadow] duration-300 ease-out ${
            scrolled
              ? "border-zinc-200/35 bg-transparent shadow-none backdrop-blur-none"
              : "border-transparent bg-transparent shadow-none backdrop-blur-none"
          }`}
        >
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-3.5">
            <Link
              href="/"
              className="group flex min-w-0 items-center gap-2.5 rounded-xl pr-1 outline-none ring-zinc-900/10 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent sm:gap-3"
            >
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-amber-500 to-orange-600 shadow-[0_4px_14px_-2px_rgba(245,158,11,0.45)] ring-[1.5px] ring-white transition-transform duration-200 group-hover:scale-[1.03] group-active:scale-[0.98] sm:h-11 sm:w-11">
                <span className="relative text-sm font-bold tracking-tight text-white">VR</span>
                <span
                  className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  aria-hidden
                />
              </div>
              <div className="min-w-0 leading-tight">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-800/85">
                  {PRODUCT_NAME}
                </p>
                <p className="truncate text-sm font-semibold text-zinc-900">Customer-facing automation</p>
              </div>
            </Link>

            <nav
              className="isolate hidden rounded-full border border-white/60 bg-gradient-to-b from-white/55 to-white/20 p-1 shadow-[0_8px_32px_-10px_rgba(24,24,27,0.14),inset_0_1px_0_0_rgba(255,255,255,0.75),inset_0_-1px_0_0_rgba(255,255,255,0.12)] backdrop-blur-xl backdrop-saturate-150 ring-1 ring-white/25 lg:flex"
              aria-label="Page sections"
            >
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-full px-3.5 py-2 text-sm font-medium text-zinc-700 outline-none transition-colors hover:bg-white/45 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-amber-400/90 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-zinc-900/20 outline-none ring-zinc-900/30 transition hover:bg-zinc-800 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-amber-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="hidden rounded-full border border-white/50 bg-white/35 px-4 py-2 text-sm font-semibold text-zinc-800 shadow-sm backdrop-blur-md outline-none transition hover:border-white/60 hover:bg-white/50 focus-visible:ring-2 focus-visible:ring-amber-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent sm:inline-flex"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-full bg-gradient-to-b from-zinc-800 to-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-zinc-900/25 outline-none ring-1 ring-white/10 transition hover:from-zinc-900 hover:to-zinc-950 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-amber-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                  >
                    Start free
                  </Link>
                </>
              )}
              <button
                type="button"
                aria-label={open ? "Close menu" : "Open menu"}
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border text-zinc-800 outline-none transition lg:hidden ${
                  open
                    ? "border-amber-200 bg-amber-50 shadow-inner shadow-amber-900/5"
                    : "border-white/50 bg-white/35 shadow-sm backdrop-blur-md hover:border-white/60 hover:bg-white/50"
                } focus-visible:ring-2 focus-visible:ring-amber-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent`}
              >
                <span className="relative h-5 w-5">
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
              className="fixed inset-0 z-40 bg-zinc-950/40 backdrop-blur-[2px] lg:hidden"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            />
            <div className="absolute left-0 right-0 top-full z-50 px-3 pt-2 lg:hidden">
              <nav
                className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-white/55 bg-gradient-to-b from-white/75 to-white/40 p-2 shadow-[0_24px_56px_-16px_rgba(24,24,27,0.2),inset_0_1px_0_0_rgba(255,255,255,0.85)] ring-1 ring-white/30 backdrop-blur-2xl backdrop-saturate-150"
                aria-label="Mobile"
              >
                <div className="flex flex-col gap-0.5">
                  {NAV.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between rounded-xl px-4 py-3 text-[15px] font-semibold text-zinc-800 transition hover:bg-white/55 active:bg-white/40"
                    >
                      {item.label}
                      <svg
                        className="h-4 w-4 text-zinc-400"
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
                <div className="mt-2 border-t border-white/40 pt-2">
                  {isLoggedIn ? (
                    <Link
                      href="/dashboard"
                      onClick={() => setOpen(false)}
                      className="flex w-full items-center justify-center rounded-xl bg-zinc-900 py-3.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
                    >
                      Go to dashboard
                    </Link>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href="/login"
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-center rounded-xl border border-zinc-200 bg-white py-3.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
                      >
                        Sign in
                      </Link>
                      <Link
                        href="/register"
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-center rounded-xl bg-gradient-to-b from-zinc-800 to-zinc-900 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:from-zinc-900 hover:to-zinc-950"
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
