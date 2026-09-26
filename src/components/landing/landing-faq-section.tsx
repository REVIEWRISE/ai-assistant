"use client";

import { useState } from "react";

type FaqItem = { readonly q: string; readonly paragraphs: readonly string[] };

export function LandingFaqSection({ faq }: { faq: readonly FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleIndex = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="relative overflow-hidden bg-[var(--color-bg)] py-24 sm:py-32 border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          {/* Left Column: Heading & Support Link */}
          <div>
            <div className="vr-landing-eyebrow">
              <span>Frequently Asked Questions</span>
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-[var(--color-text)] sm:text-4xl">
              Everything you need to know before starting.
            </h2>
            <p className="mt-4 text-base leading-7 text-[var(--color-text-muted)]">
              Have specific questions regarding your custom POS, multi-location compliance, or dedicated LLM hosting?
            </p>

            <div className="mt-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-6 shadow-sm">
              <p className="text-sm font-bold text-[var(--color-text)]">Have a custom question?</p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">Our product engineering team is happy to walk through your exact technical architecture.</p>
              <a
                href="#contact"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary-h)] hover:underline"
              >
                <span>Talk with an engineer</span>
                <span aria-hidden>→</span>
              </a>
            </div>
          </div>

          {/* Right Column: Accordion Items */}
          <div className="space-y-4">
            {faq.map((item, index) => {
              const isOpen = openIndex === index;
              return (
                <div
                  key={item.q}
                  className={`rounded-2xl border transition-all duration-200 ${
                    isOpen
                      ? "border-[var(--color-primary)] bg-[var(--color-surface)] shadow-md"
                      : "border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-border))]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleIndex(index)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left sm:p-6"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-[var(--color-primary-h)]">
                        0{index + 1}
                      </span>
                      <span className="text-sm font-semibold tracking-tight text-[var(--color-text)] sm:text-base">
                        {item.q}
                      </span>
                    </div>

                    <span
                      className={`flex size-8 shrink-0 items-center justify-center rounded-full transition-transform duration-200 ${
                        isOpen
                          ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)] rotate-45"
                          : "bg-[var(--color-surface)] text-[var(--color-text-muted)] border border-[var(--color-border)]"
                      }`}
                    >
                      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </span>
                  </button>

                  {isOpen && (
                    <div className="space-y-3 border-t border-[var(--color-border)] px-5 pb-6 pt-4 sm:px-6 sm:pl-14">
                      {item.paragraphs.map((p) => (
                        <p key={p} className="text-sm leading-7 text-[var(--color-text-muted)]">
                          {p}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
