import { TrustedByMarquee } from "@/components/trusted-by-marquee";

export function LandingTrustedSection({ names }: { names: readonly string[] }) {
  return (
    <section className="relative border-t border-zinc-200/50 bg-[#faf8f5] py-8 sm:py-10">
      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-900/75">Trusted by</p>
          <h2 className="mt-2 text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl">Teams shipping faster</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Conversations, bookings, and follow-ups—without the extra hires.
          </p>
        </div>
        <div className="mt-6 sm:mt-7" aria-label="Trusted companies">
          <TrustedByMarquee names={[...names]} />
        </div>
      </div>
    </section>
  );
}
