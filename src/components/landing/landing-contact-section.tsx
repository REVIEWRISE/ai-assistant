import Link from "next/link";
import { CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_TEL } from "@/lib/brand";

export function LandingContactSection() {
  return (
    <section id="contact" className="bg-[var(--color-bg)] px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
      <div className="landing-dark relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,#080d18,#131c36_58%,#242d65)] px-6 py-12 shadow-[0_30px_90px_-48px_rgba(15,23,42,0.85)] sm:px-10 sm:py-14 lg:px-14 lg:py-16">
        <div className="landing-grid pointer-events-none absolute inset-0 opacity-[0.1]" aria-hidden />
        <div className="pointer-events-none absolute -right-24 -top-32 size-80 rounded-full bg-indigo-500/25 blur-3xl" aria-hidden />

        <div className="relative grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">Ready when you are</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl lg:text-5xl">
              Give every customer a fast, thoughtful next step.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Start a free trial or tell us about your current workflow. We&rsquo;ll help you choose the right first automation.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link href="/register" className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-slate-950 transition hover:bg-indigo-50">
              Start 14-day trial
            </Link>
            <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 bg-white/[0.05] px-6 text-sm font-semibold text-white transition hover:bg-white/[0.1]">
              Talk to our team
            </a>
          </div>
        </div>

        <div className="relative mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/10 pt-6 text-sm text-slate-300">
          <a href={`mailto:${CONTACT_EMAIL}`} className="transition hover:text-white">{CONTACT_EMAIL}</a>
          <a href={`tel:${CONTACT_PHONE_TEL}`} className="transition hover:text-white">{CONTACT_PHONE}</a>
          <span>Mon–Fri · 9am–6pm</span>
        </div>
      </div>
    </section>
  );
}
