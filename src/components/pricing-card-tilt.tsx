"use client";

import { useCallback, useRef, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  className: string;
};

/** Pointer-based 3D tilt; disabled when prefers-reduced-motion is set. */
export function PricingCardTilt({ children, className }: Props) {
  const surfaceRef = useRef<HTMLDivElement>(null);

  const applyTilt = useCallback((clientX: number, clientY: number) => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = surfaceRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (clientX - rect.left) / rect.width - 0.5;
    const py = (clientY - rect.top) / rect.height - 0.5;
    const maxX = 7;
    const maxY = 9;
    const rotateX = -py * maxX * 2;
    const rotateY = px * maxY * 2;
    el.style.transition = "none";
    el.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0)`;
  }, []);

  const resetTilt = useCallback(() => {
    const el = surfaceRef.current;
    if (!el) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    el.style.transition = "transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)";
    el.style.transform = "rotateX(0deg) rotateY(0deg) translateZ(0)";
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col" style={{ perspective: "1200px" }}>
      <div
        ref={surfaceRef}
        suppressHydrationWarning
        className={`transform-gpu will-change-transform [transform-style:preserve-3d] ${className}`}
        onMouseMove={(e) => applyTilt(e.clientX, e.clientY)}
        onMouseLeave={resetTilt}
      >
        {children}
      </div>
    </div>
  );
}
