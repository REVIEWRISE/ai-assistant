"use client";

import Link from "next/link";
import { LandingLogoMark } from "@/components/landing/landing-logo-mark";
import { CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_TEL } from "@/lib/brand";
import { trackContactClick, trackLandingCta } from "@/lib/analytics";

const contactLinkClass = "font-semibold text-white underline-offset-4 hover:underline";

export function LandingContactSection() {
  return (
    <section id="contact" className="lp-blue">
      <LandingLogoMark className="lp-mark -right-24 -top-24 w-[34rem] max-w-none lg:-right-10 lg:-top-40 lg:w-[48rem]" />

      <div className="lp-wrap grid gap-10 py-20 sm:py-28 lg:grid-cols-[1.25fr_0.75fr] lg:items-end lg:gap-20">
        <div>
          <h2 className="lp-h1">Give every customer a fast, thoughtful next step.</h2>
          <p className="mt-6 max-w-xl text-lg leading-[1.65] text-[var(--lp-on-blue-muted)]">
            Start your 14-day free trial today or speak directly with our solutions team to configure custom
            multi-location workflows.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/register"
              onClick={() => {
                trackContactClick("trial", "/register");
                trackLandingCta("Start 14-Day Free Trial", "contact_box", "/register");
              }}
              className="lp-btn lp-btn-white"
            >
              Start 14-day free trial
            </Link>
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=VyntRise%20Agent%20Demo%20Request`}
              onClick={() => {
                trackContactClick("email", "demo_request");
                trackLandingCta("Schedule Operator Demo", "contact_box", "mailto");
              }}
              className="lp-btn lp-btn-on-blue"
            >
              Schedule a demo
            </a>
          </div>
        </div>

        <dl className="space-y-4 border-t border-white/25 pt-6 text-[15px] text-[var(--lp-on-blue-muted)] lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
          <div>
            <dt>Direct support</dt>
            <dd className="mt-0.5">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                onClick={() => trackContactClick("email", CONTACT_EMAIL)}
                className={contactLinkClass}
              >
                {CONTACT_EMAIL}
              </a>
            </dd>
          </div>
          <div>
            <dt>Phone / SMS</dt>
            <dd className="mt-0.5">
              <a
                href={`tel:${CONTACT_PHONE_TEL}`}
                onClick={() => trackContactClick("phone", CONTACT_PHONE_TEL)}
                className={contactLinkClass}
              >
                {CONTACT_PHONE}
              </a>
            </dd>
          </div>
          <div>
            <dt>Response time</dt>
            <dd className="mt-0.5 font-semibold text-white">&lt; 15 mins (Mon–Fri)</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
