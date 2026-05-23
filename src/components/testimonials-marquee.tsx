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
      "bg-gradient-to-br from-primary to-indigo-700 shadow-lg shadow-primary/25 ring-2 ring-white/90",
    glow: "from-primary/30 via-indigo-300/12 to-transparent",
    chip: "border-primary/25 bg-primary/10 text-[var(--color-primary-h)]",
    star: "text-primary",
  },
  {
    avatar:
      "bg-gradient-to-br from-[var(--color-grad-start)] to-[var(--color-grad-end)] shadow-lg shadow-primary/20 ring-2 ring-white/90",
    glow: "from-sky-400/25 via-cyan-300/12 to-transparent",
    chip: "border-sky-200/80 bg-sky-500/10 text-sky-800",
    star: "text-sky-600",
  },
  {
    avatar:
      "bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/20 ring-2 ring-white/90",
    glow: "from-violet-400/20 via-purple-300/12 to-transparent",
    chip: "border-violet-200/80 bg-violet-500/10 text-violet-800",
    star: "text-violet-600",
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
      className="group relative flex w-[min(100vw-2rem,21rem)] shrink-0 flex-col overflow-hidden rounded-[1.65rem] border border-[var(--color-border)] bg-gradient-to-b from-[var(--color-bg)] via-[var(--color-bg)]/95 to-[var(--color-surface)] shadow-[var(--shadow-md)] backdrop-blur-md transition-[transform,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-[var(--color-border-hover)] hover:shadow-[var(--shadow-lg)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:w-[23rem]"
    >
      <div
        className={`pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-gradient-to-br ${t.glow} opacity-80 blur-3xl transition-opacity duration-700 ease-out group-hover:opacity-100 motion-reduce:transition-none`}
        aria-hidden
      />

      <div className="relative flex flex-col px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
        <header className="relative flex items-start gap-3.5">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[11px] font-bold tracking-wide text-white transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100 ${t.avatar}`}
            aria-hidden
          >
            {initials(item.name)}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold tracking-tight text-[var(--color-text)]">{item.name}</p>
              <span
                className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] ${t.chip}`}
              >
                Client
              </span>
            </div>
            <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-[var(--color-text-muted)]">{item.role}</p>
          </div>
        </header>

        <blockquote className="relative mt-5">
          <span
            className="pointer-events-none absolute -left-0.5 top-0 font-serif text-[3.25rem] leading-[0.85] text-[var(--color-border)] transition-colors duration-500 ease-out select-none group-hover:text-[var(--color-border-hover)] motion-reduce:transition-none"
            aria-hidden
          >
            &ldquo;
          </span>
          <p className="relative z-[1] pl-6 text-[0.9375rem] leading-[1.65] text-[var(--color-text-muted)] transition-colors duration-500 ease-out group-hover:text-[var(--color-text)] motion-reduce:transition-none sm:text-base sm:leading-relaxed">
            {item.quote}
          </p>
        </blockquote>

        <footer className="relative mt-6 flex justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 transition-[background-color,box-shadow,border-color] duration-500 ease-out group-hover:border-[var(--color-border-hover)] group-hover:bg-[var(--color-bg)] group-hover:shadow-sm motion-reduce:transition-none">
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
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-4 sm:grid-cols-2 sm:px-6">
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
        className="relative w-full overflow-hidden"
        style={{
          maskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
        }}
        onMouseEnter={handleMarqueeEnter}
        onMouseLeave={handleMarqueeLeave}
      >
        <div className="overflow-hidden pb-2 pt-2 md:pb-3 md:pt-3">
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
