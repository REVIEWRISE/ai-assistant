"use client";

import { useState } from "react";
import { trackDemoPlayground } from "@/lib/analytics";

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

function optionClass(selected: boolean) {
  return `rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
    selected
      ? "border-[var(--lp-solid)] bg-[var(--lp-solid)] text-white"
      : "border-[var(--color-border-hover)] text-[var(--color-text-muted)] hover:border-[var(--lp-accent)] hover:text-[var(--color-text)]"
  }`;
}

export function LandingDemoPlayground() {
  const [scenario, setScenario] = useState(SCENARIOS[0]);
  const [tone, setTone] = useState<string>("warm");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState(SCENARIOS[0].output);
  const [copied, setCopied] = useState(false);

  const generate = () => {
    trackDemoPlayground("generate", scenario.id);
    setLoading(true);
    setTimeout(() => { setOutput(scenario.output); setLoading(false); }, 380);
  };

  const handleScenario = (s: Scenario) => {
    trackDemoPlayground("switch_scenario", s.id);
    setScenario(s);
    setOutput(s.output);
    setCopied(false);
  };

  const handleTone = (t: string) => {
    trackDemoPlayground("switch_tone", t);
    setTone(t);
    setLoading(true);
    setTimeout(() => { setOutput(scenario.output); setLoading(false); }, 280);
  };

  const copy = () => {
    trackDemoPlayground("copy", scenario.id);
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="demo-playground" className="lp-section lp-tinted">
      <div className="lp-wrap grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-20">
        <div>
          <h2 className="lp-h2">See the AI respond in real time.</h2>
          <p className="lp-lede mt-5">
            Select a scenario, choose your brand voice, and watch VyntRise draft a precise reply in under a second.
          </p>

          <div className="mt-9">
            <h3 className="text-sm font-semibold text-[var(--color-text)]">Customer interaction</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={scenario.id === s.id}
                  onClick={() => handleScenario(s)}
                  className={optionClass(scenario.id === s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-7">
            <h3 className="text-sm font-semibold text-[var(--color-text)]">Brand voice</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {TONES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={tone === t.id}
                  onClick={() => handleTone(t.id)}
                  className={optionClass(tone === t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--lp-tint-line)] bg-[var(--color-bg)] p-5 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[var(--color-text)]">Customer message</p>
            {scenario.stars ? (
              <span className="text-sm text-amber-500" role="img" aria-label={`${scenario.stars} out of 5 stars`}>
                {"★".repeat(scenario.stars)}
              </span>
            ) : null}
          </div>
          <p className="mt-3 max-w-[92%] rounded-2xl rounded-tl-md bg-[var(--color-raised)] px-4 py-3 text-[15px] leading-7 text-[var(--color-text)]">
            {scenario.input}
          </p>

          <p className="mt-7 text-right text-sm font-semibold text-[var(--lp-accent)]">Ready to publish</p>
          <div
            aria-live="polite"
            className="ml-auto mt-3 min-h-40 max-w-[92%] rounded-2xl rounded-tr-md bg-[var(--lp-solid)] px-4 py-3 text-[15px] leading-7 text-white"
          >
            {loading ? "Formulating response…" : output}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--color-border)] pt-5">
            <p className="text-sm text-[var(--color-text-muted)]">
              Response time 0.4s · Safety score 100% clear
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={copy} className="lp-btn lp-btn-sm lp-btn-outline">
                {copied ? "Copied" : "Copy"}
              </button>
              <button type="button" onClick={generate} disabled={loading} className="lp-btn lp-btn-sm lp-btn-solid">
                {loading ? "Generating…" : "Re-generate"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
