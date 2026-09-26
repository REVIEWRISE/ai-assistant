"use client";

import { useState } from "react";

type Scenario = { id: string; label: string; stars?: number; input: string; output: string };

const SCENARIOS: Scenario[] = [
  {
    id: "review-5",
    label: "5-Star Review",
    stars: 5,
    input: "The catering for our 45-person corporate lunch was incredible. Food arrived piping hot and the team loved every dish!",
    output: "Thank you so much for the wonderful feedback! We're thrilled your team enjoyed the lunch — it was a pleasure serving you. We look forward to catering your next corporate event!",
  },
  {
    id: "review-3",
    label: "3-Star Feedback",
    stars: 3,
    input: "Food was good as always, but our reserved table wasn't ready and we waited 20 minutes.",
    output: "Thank you for sharing this with us. While we're glad the food met your expectations, a 20-minute wait past your reservation time isn't acceptable. Please reach out directly so we can make it right on your next visit.",
  },
  {
    id: "lead",
    label: "Inbound Inquiry",
    input: "Hi, we're planning a holiday dinner for 50 guests on Dec 12th. Do you have private dining and a set menu?",
    output: "Hello! We'd love to host your holiday dinner on Dec 12th. We do have private dining for 50 guests along with seasonal menu packages. Here's our direct booking link and holiday brochure — happy to answer any questions!",
  },
];

const TONES = [
  { id: "warm", label: "Warm & Gracious" },
  { id: "direct", label: "Executive & Direct" },
  { id: "friendly", label: "Enthusiastic" },
] as const;

export function LandingDemoPlayground() {
  const [scenario, setScenario] = useState(SCENARIOS[0]);
  const [tone, setTone] = useState<string>("warm");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState(SCENARIOS[0].output);
  const [copied, setCopied] = useState(false);

  const generate = () => {
    setLoading(true);
    setTimeout(() => { setOutput(scenario.output); setLoading(false); }, 380);
  };

  const handleScenario = (s: Scenario) => {
    setScenario(s);
    setOutput(s.output);
    setCopied(false);
  };

  const handleTone = (t: string) => {
    setTone(t);
    setLoading(true);
    setTimeout(() => { setOutput(scenario.output); setLoading(false); }, 280);
  };

  const copy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="demo-playground" className="border-y border-[var(--color-border)] bg-[var(--color-surface)]/60 py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center">
          <div className="vr-landing-eyebrow">Live Interactive Sandbox</div>
          <h2 className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-[var(--color-text)] sm:text-4xl">
            See the AI respond in{" "}
            <span className="vr-gradient-text">real time.</span>
          </h2>
          <p className="mt-4 text-base text-[var(--color-text-muted)]">
            Select a scenario, choose your brand voice, and watch VyntRise draft a precise reply in under a second.
          </p>
        </div>

        {/* Sandbox card */}
        <div className="mt-12 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-sm">

          {/* Step 1: Scenario */}
          <div className="border-b border-[var(--color-border)] p-6 sm:p-7">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
              1 — Choose a customer interaction
            </p>
            <div className="flex flex-wrap gap-2">
              {SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleScenario(s)}
                  className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                    scenario.id === s.id
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary-h)]"
                      : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-text)]"
                  }`}
                >
                  {s.label}
                  {s.stars && (
                    <span className="ml-1.5 text-amber-400">{"★".repeat(s.stars)}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Input preview */}
            <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5">
              <p className="text-xs font-medium text-[var(--color-text-subtle)]">Customer message</p>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text)]">{scenario.input}</p>
            </div>
          </div>

          {/* Step 2: Tone */}
          <div className="border-b border-[var(--color-border)] p-6 sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
                  2 — Choose brand voice
                </p>
                <div className="flex flex-wrap gap-2">
                  {TONES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleTone(t.id)}
                      className={`rounded-lg border px-3.5 py-2 text-xs font-semibold transition ${
                        tone === t.id
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
                          : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={generate}
                className="vr-landing-btn-primary self-start h-10 px-5 text-xs sm:self-auto"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Generating…
                  </span>
                ) : "Re-generate"}
              </button>
            </div>
          </div>

          {/* Output */}
          <div className="p-6 sm:p-7">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-[var(--color-primary)]" />
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-primary-h)]">
                  AI Response
                </p>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                  Ready to publish
                </span>
              </div>
              <button
                type="button"
                onClick={copy}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)] transition hover:border-[var(--color-primary)]"
              >
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>

            <div className="mt-4 min-h-[64px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5">
              {loading ? (
                <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                  <span className="size-1.5 animate-pulse rounded-full bg-[var(--color-primary)]" />
                  Formulating response…
                </div>
              ) : (
                <p className="text-sm leading-relaxed text-[var(--color-text)]">{output}</p>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-xs text-[var(--color-text-subtle)]">
              <span>Response time: <strong className="text-[var(--color-text)]">0.4s</strong></span>
              <span>Safety score: <strong className="text-emerald-500">100% clear</strong></span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
