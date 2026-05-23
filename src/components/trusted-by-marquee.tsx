"use client";

import { useEffect, useState } from "react";

type Props = {
  names: string[];
};

const ACCENT = [
  {
    mono: "bg-gradient-to-br from-primary to-indigo-700 shadow-lg shadow-primary/25",
  },
  {
    mono: "bg-gradient-to-br from-[var(--color-grad-start)] to-[var(--color-grad-end)] shadow-lg shadow-primary/20",
  },
  {
    mono: "bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/20",
  },
  {
    mono: "bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20",
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
      className="group flex shrink-0 items-center gap-3 rounded-full border border-[var(--color-border)] bg-gradient-to-b from-[var(--color-bg)] via-[var(--color-bg)]/95 to-[var(--color-surface)] py-2 pl-2 pr-5 shadow-[var(--shadow-sm)] backdrop-blur-md transition-[box-shadow,transform,border-color] duration-300 hover:-translate-y-px hover:border-primary/30 hover:shadow-[var(--shadow-md)] motion-reduce:hover:translate-y-0 md:gap-3.5 md:py-2.5 md:pl-2.5 md:pr-6"
    >
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-full text-[10px] font-bold tracking-wide text-white ring-2 ring-white/90 md:h-10 md:w-10 md:text-[11px] ${a.mono}`}
        aria-hidden
      >
        {initials(name)}
      </span>
      <span className="max-w-[11.5rem] truncate text-sm font-semibold tracking-tight text-[var(--color-text)] md:max-w-[13.5rem] md:text-[0.9375rem]">
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
            @keyframes vr-trusted-marquee {
              0% { transform: translate3d(0, 0, 0); }
              100% { transform: translate3d(-50%, 0, 0); }
            }
            .vr-trusted-marquee-track {
              animation: vr-trusted-marquee 48s linear infinite;
            }
          `,
        }}
      />
      <div
        className="relative w-full overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
        }}
      >
        <div className="overflow-hidden py-3 md:py-4">
          <div className="vr-trusted-marquee-track flex w-max items-center gap-4 md:gap-5 hover:[animation-play-state:paused]">
            {loop.map((name, i) => (
              <BrandCard key={`${name}-${i}`} name={name} accentIndex={i} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
