import Link from "next/link";
import {
  AppPageHero,
  AppPageHeroBadge,
} from "@/components/app-page-hero";
import { Panel } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AppointmentsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ai_session")?.value;

  if (!token) {
    redirect("/login");
  }

  const session = await prisma.session.findFirst({
    where: {
      token,
      expiresAt: { gt: new Date() },
    },
    select: {
      activeOrganization: {
        select: { name: true },
      },
    },
  });

  if (!session) {
    redirect("/login");
  }

  const activeOrganization = session.activeOrganization;

  return (
    <div className="space-y-4 lg:space-y-6">
      <AppPageHero
        eyebrow="Appointment Agent"
        title={
          <>
            Manage appointment modules and{" "}
            <span className="vr-brand-gradient-text">setup</span>
          </>
        }
        description="Configure organization context, build your knowledge base, and monitor booking operations."
      >
        <AppPageHeroBadge>
          Active organization: {activeOrganization?.name ?? "Not selected"}
        </AppPageHeroBadge>
      </AppPageHero>

      <Panel title="Appointment Modules" subtitle="Choose a section to configure">
        <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <Link
            href="/appointments/overview"
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 transition hover:border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] hover:bg-[var(--color-surface)]"
          >
            <p className="font-semibold text-[var(--color-text)]">Overview</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Track provider status, schedule signals, and booking flow.
            </p>
          </Link>
          <Link
            href="/appointments/organization"
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 transition hover:border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] hover:bg-[var(--color-surface)]"
          >
            <p className="font-semibold text-[var(--color-text)]">Organization</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Manage active organization and workspace lifecycle.
            </p>
          </Link>
          <Link
            href="/appointments/knowledge-base"
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 transition hover:border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] hover:bg-[var(--color-surface)]"
          >
            <p className="font-semibold text-[var(--color-text)]">Knowledge Base</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Import business context from your website, docs, and notes.
            </p>
          </Link>
          <Link
            href="/appointments/chatbot"
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 transition hover:border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] hover:bg-[var(--color-surface)]"
          >
            <p className="font-semibold text-[var(--color-text)]">Configure chatbot</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Customize floating booking assistant text and services.
            </p>
          </Link>
        </div>
      </Panel>
    </div>
  );
}
