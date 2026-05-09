"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type TestimonialItem = {
  quote: string;
  name: string;
  role: string;
};

type Props = {
  items: TestimonialItem[];
};

const THEMES = [
  {
    avatar:
      "bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25 ring-amber-100/50",
    glow: "from-amber-400/30 via-orange-300/12 to-transparent",
    chip: "bg-amber-500/[0.12] text-amber-900/90 ring-amber-300/40",
    star: "text-amber-500",
  },
  {
    avatar:
      "bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-500/25 ring-teal-100/50",
    glow: "from-teal-400/28 via-emerald-300/10 to-transparent",
    chip: "bg-teal-500/[0.12] text-teal-900/90 ring-teal-300/40",
    star: "text-teal-600",
  },
  {
    avatar:
      "bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25 ring-violet-100/50",
    glow: "from-violet-400/25 via-purple-300/10 to-transparent",
    chip: "bg-violet-500/[0.12] text-violet-900/90 ring-violet-300/40",
    star: "text-violet-600",
  },
  {
    avatar: "bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/25 ring-sky-100/50",
    glow: "from-sky-400/22 via-blue-300/10 to-transparent",
    chip: "bg-sky-500/[0.12] text-sky-900/90 ring-sky-300/40",
    star: "text-sky-600",
  },
] as const;

const MARQUEE_EASE_MS = 520;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function StarRow({ className }: { className: string }) {
  return (
    <div className="flex items-center gap-0.5" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className={`h-3 w-3 ${className}`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

function TestimonialCard({ item, index }: { item: TestimonialItem; index: number }) {
  const t = THEMES[index % THEMES.length];
  return (
    <article
      className="group relative flex w-[min(100vw-2rem,21rem)] shrink-0 flex-col overflow-hidden rounded-[1.65rem] bg-gradient-to-b from-white/95 via-white/88 to-white/70 shadow-[0_20px_56px_-28px_rgba(24,24,27,0.14),0_8px_24px_-12px_rgba(24,24,27,0.06),inset_0_1px_0_0_rgba(255,255,255,1)] ring-1 ring-zinc-200/70 backdrop-blur-md transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:shadow-[0_28px_64px_-28px_rgba(24,24,27,0.18),0_12px_32px_-16px_rgba(24,24,27,0.08)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:w-[23rem]"
    >
      <div
        className={`pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-gradient-to-br ${t.glow} opacity-80 blur-3xl transition-opacity duration-700 ease-out group-hover:opacity-100 motion-reduce:transition-none`}
        aria-hidden
      />

      <div className="relative flex flex-col px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
        <header className="relative flex items-start gap-3.5">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[11px] font-bold tracking-wide text-white ring-2 ring-white/90 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100 ${t.avatar}`}
            aria-hidden
          >
            {initials(item.name)}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold tracking-tight text-zinc-900">{item.name}</p>
              <span
                className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] ring-1 ${t.chip}`}
              >
                Client
              </span>
            </div>
            <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-zinc-500">{item.role}</p>
          </div>
        </header>

        <blockquote className="relative mt-5">
          <span
            className="pointer-events-none absolute -left-0.5 top-0 font-serif text-[3.25rem] leading-[0.85] text-zinc-200/95 transition-colors duration-500 ease-out select-none group-hover:text-zinc-300/90 motion-reduce:transition-none"
            aria-hidden
          >
            &ldquo;
          </span>
          <p className="relative z-[1] pl-6 text-[0.9375rem] leading-[1.65] text-zinc-600 transition-colors duration-500 ease-out group-hover:text-zinc-700 motion-reduce:transition-none sm:text-base sm:leading-relaxed">
            {item.quote}
          </p>
        </blockquote>

        <footer className="relative mt-6 flex justify-center rounded-xl bg-zinc-50/80 px-3.5 py-2.5 ring-1 ring-zinc-200/60 transition-[background-color,box-shadow] duration-500 ease-out group-hover:bg-white/90 group-hover:shadow-sm motion-reduce:transition-none">
          <StarRow className={t.star} />
        </footer>
      </div>
    </article>
  );
}

function easeOutQuad(t: number) {
  return 1 - (1 - t) * (1 - t);
}

export function TestimonialsMarquee({ items }: Props) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<Animation | null>(null);
  const rampTokenRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;

    const capture = () => {
      const el = trackRef.current;
      if (!el) return;
      const list = el.getAnimations();
      animRef.current = list[0] ?? null;
    };

    const id = requestAnimationFrame(() => requestAnimationFrame(capture));
    return () => cancelAnimationFrame(id);
  }, [reduceMotion, items.length]);

  const cancelRamp = useCallback(() => {
    rampTokenRef.current += 1;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const rampToRate = useCallback(
    (targetRate: number, thenPause: boolean) => {
      const anim = animRef.current;
      if (!anim || reduceMotion) return;

      cancelRamp();
      const token = rampTokenRef.current;
      const startWall = performance.now();
      const from = anim.playbackRate;

      const tick = (now: number) => {
        if (token !== rampTokenRef.current) return;
        const t = Math.min(1, (now - startWall) / MARQUEE_EASE_MS);
        const eased = easeOutQuad(t);
        anim.playbackRate = from + (targetRate - from) * eased;
        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          rafRef.current = null;
          anim.playbackRate = targetRate;
          if (thenPause) anim.pause();
        }
      };

      rafRef.current = requestAnimationFrame(tick);
    },
    [cancelRamp, reduceMotion],
  );

  const ensureMarqueeAnim = useCallback(() => {
    const el = trackRef.current;
    if (!el) return null;
    if (!animRef.current) animRef.current = el.getAnimations()[0] ?? null;
    return animRef.current;
  }, []);

  const handleMarqueeEnter = useCallback(() => {
    if (reduceMotion) return;
    const anim = ensureMarqueeAnim();
    if (!anim) return;
    if (anim.playState === "paused") anim.play();
    rampToRate(0, true);
  }, [ensureMarqueeAnim, rampToRate, reduceMotion]);

  const handleMarqueeLeave = useCallback(() => {
    if (reduceMotion) return;
    const anim = ensureMarqueeAnim();
    if (!anim) return;
    anim.play();
    rampToRate(1, false);
  }, [ensureMarqueeAnim, rampToRate, reduceMotion]);

  useEffect(() => () => cancelRamp(), [cancelRamp]);

  const loop = [...items, ...items];

  if (reduceMotion) {
    return (
      <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2">
        {items.map((item, i) => (
          <TestimonialCard key={item.name} item={item} index={i} />
        ))}
      </div>
    );
  }

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes ai-assistant-testimonials-marquee {
              0% { transform: translate3d(0, 0, 0); }
              100% { transform: translate3d(-50%, 0, 0); }
            }
            .ai-assistant-testimonials-track {
              animation: ai-assistant-testimonials-marquee 56s linear infinite;
            }
          `,
        }}
      />
      <div
        className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2"
        style={{
          maskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
        }}
        onMouseEnter={handleMarqueeEnter}
        onMouseLeave={handleMarqueeLeave}
      >
        <div className="overflow-hidden py-2 md:py-3">
          <div ref={trackRef} className="ai-assistant-testimonials-track flex w-max items-stretch gap-5 md:gap-7">
            {loop.map((item, i) => (
              <TestimonialCard key={`${item.name}-${i}`} item={item} index={i} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
