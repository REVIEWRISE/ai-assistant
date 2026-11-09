"use client";

import { useState } from "react";
import { trackFaqToggle, trackLandingCta } from "@/lib/analytics";

type FaqItem = { readonly q: string; readonly paragraphs: readonly string[] };

export function LandingFaqSection({ faq }: { faq: readonly FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleIndex = (index: number) => {
    const isOpening = openIndex !== index;
    setOpenIndex(isOpening ? index : null);
    if (faq[index]) {
      trackFaqToggle(faq[index].q, isOpening);
    }
  };

  return (
    <section id="faq" className="lp-section lp-tinted">
      <div className="lp-wrap grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div>
          <h2 className="lp-h2">Everything you need to know before starting.</h2>
          <p className="lp-lede mt-5">
            Have specific questions regarding your custom POS, multi-location compliance, or dedicated LLM hosting?
          </p>
          <a
            href="#contact"
            onClick={() => trackLandingCta("Talk with an engineer", "faq_sidebar", "#contact")}
            className="lp-btn lp-btn-outline mt-7"
          >
            Talk with an engineer
          </a>
        </div>

        <div className="border-t border-[var(--lp-tint-line)]">
          {faq.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={item.q} className="border-b border-[var(--lp-tint-line)]">
                <h3>
                  <button
                    type="button"
                    onClick={() => toggleIndex(index)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-6 py-6 text-left text-lg font-semibold tracking-[-0.015em] text-[var(--color-text)]"
                  >
                    {item.q}
                    <svg
                      className={`size-5 shrink-0 text-[var(--lp-accent)] transition-transform duration-200 ${isOpen ? "rotate-45" : ""}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      aria-hidden
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                </h3>

                {isOpen ? (
                  <div className="space-y-3 pb-7 pr-10">
                    {item.paragraphs.map((paragraph) => (
                      <p key={paragraph} className="text-[15px] leading-7 text-[var(--color-text-muted)]">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
