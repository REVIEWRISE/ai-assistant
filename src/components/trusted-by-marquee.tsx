"use client";

import { useEffect, useState } from "react";

type Props = {
  names: string[];
};

const ACCENT = [
  {
    mono: "bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/25",
  },
  {
    mono: "bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-500/25",
  },
  {
    mono: "bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/25",
  },
  {
    mono: "bg-gradient-to-br from-orange-500 to-rose-600 shadow-orange-500/25",
  },
] as const;

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function BrandCard({ name, accentIndex }: { name: string; accentIndex: number }) {
  const a = ACCENT[accentIndex % ACCENT.length];
  return (
    <article
      className="group flex shrink-0 items-center gap-3 rounded-full bg-gradient-to-b from-white/90 via-white/70 to-white/55 py-2 pl-2 pr-5 shadow-[0_8px_30px_-12px_rgba(24,24,27,0.1),0_2px_8px_-4px_rgba(24,24,27,0.05),inset_0_1px_0_0_rgba(255,255,255,0.95)] backdrop-blur-xl transition-[box-shadow,transform] duration-300 hover:shadow-[0_10px_28px_-12px_rgba(24,24,27,0.08),0_2px_10px_-4px_rgba(24,24,27,0.04)] hover:-translate-y-px motion-reduce:hover:translate-y-0 md:gap-3.5 md:py-2.5 md:pl-2.5 md:pr-6"
    >
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-full text-[10px] font-bold tracking-wide text-white shadow-lg md:h-10 md:w-10 md:text-[11px] ${a.mono}`}
        aria-hidden
      >
        {initials(name)}
      </span>
      <span className="max-w-[11.5rem] truncate text-sm font-semibold tracking-tight text-zinc-800 md:max-w-[13.5rem] md:text-[0.9375rem]">
        {name}
      </span>
    </article>
  );
}

export function TrustedByMarquee({ names }: Props) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const loop = [...names, ...names];

  if (reduceMotion) {
    return (
      <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-3 sm:gap-4">
        {names.map((name, i) => (
          <BrandCard key={name} name={name} accentIndex={i} />
        ))}
      </div>
    );
  }

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes ai-assistant-trusted-marquee {
              0% { transform: translate3d(0, 0, 0); }
              100% { transform: translate3d(-50%, 0, 0); }
            }
            .ai-assistant-trusted-track {
              animation: ai-assistant-trusted-marquee 48s linear infinite;
            }
          `,
        }}
      />
      <div
        className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2"
        style={{
          maskImage:
            "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
        }}
      >
        <div className="overflow-hidden py-3 md:py-4">
          <div className="ai-assistant-trusted-track flex w-max items-center gap-4 md:gap-5 hover:[animation-play-state:paused]">
            {loop.map((name, i) => (
              <BrandCard key={`${name}-${i}`} name={name} accentIndex={i} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
