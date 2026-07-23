import Link from "next/link";
import { AppointmentPageHeader } from "@/components/appointment-page-header";
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
        select: {
          id: true,
          name: true,
          knowledgeBase: { select: { status: true } },
          chatbotSettings: { select: { id: true } },
        },
      },
    },
  });

  if (!session) {
    redirect("/login");
  }

  const activeOrganization = session.activeOrganization;
  const modules = [
    {
      href: "/appointments/overview",
      eyebrow: "Operate",
      title: "Booking overview",
      description: "Monitor calendar health, upcoming appointments, and booking delivery.",
      status: activeOrganization ? "Open workspace" : "Select an organization",
      ready: Boolean(activeOrganization),
    },
    {
      href: "/appointments/organization",
      eyebrow: "Workspace",
      title: "Organization",
      description: "Manage the business identity and active workspace used by the agent.",
      status: activeOrganization?.name ?? "Not selected",
      ready: Boolean(activeOrganization),
    },
    {
      href: "/appointments/knowledge-base",
      eyebrow: "Business context",
      title: "Knowledge base",
      description: "Import services and policies that guide booking conversations.",
      status: activeOrganization?.knowledgeBase?.status === "approved" ? "Approved" : "Needs approval",
      ready: activeOrganization?.knowledgeBase?.status === "approved",
    },
    {
      href: "/appointments/chatbot",
      eyebrow: "Experience",
      title: "Booking assistant",
      description: "Customize prompts, booking questions, voice, CRM, and website embed.",
      status: activeOrganization?.chatbotSettings ? "Configured" : "Needs configuration",
      ready: Boolean(activeOrganization?.chatbotSettings),
    },
  ];

  return (
    <div className="mx-auto max-w-[92rem] space-y-4">
      <AppointmentPageHeader
        title="Appointment Agent workspace"
        description="Set up the business context once, then monitor and improve every booking channel from one place."
        status={activeOrganization ? activeOrganization.name : "Organization required"}
        statusTone={activeOrganization ? "success" : "warning"}
        actions={activeOrganization ? [{ href: "/appointments/overview", label: "Open operations", primary: true }] : [{ href: "/appointments/organization", label: "Choose organization", primary: true }]}
        metrics={[
          { label: "Workspace", value: activeOrganization?.name ?? "Not selected" },
          { label: "Knowledge", value: activeOrganization?.knowledgeBase?.status === "approved" ? "Approved" : "Needs approval" },
          { label: "Assistant", value: activeOrganization?.chatbotSettings ? "Configured" : "Not configured" },
        ]}
      />

      <section className="rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)] lg:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary-h)]">Workflow</p>
            <h2 className="mt-1 text-base font-semibold text-[var(--color-text)]">Appointment modules</h2>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">Move from setup to daily operations.</p>
          </div>
          <p className="text-[11px] text-[var(--color-text-muted)]">{modules.filter((module) => module.ready).length} of {modules.length} ready</p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {modules.map((module, index) => (
            <Link
              key={module.href}
              href={module.href}
              className="group flex min-h-44 flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 transition hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--color-primary)_30%,var(--color-border))] hover:shadow-[var(--shadow-sm)]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-[var(--color-raised)] text-[11px] font-semibold text-[var(--color-text-muted)]">{index + 1}</span>
                <span className={`size-2 rounded-full ${module.ready ? "bg-emerald-500" : "bg-amber-400"}`} aria-hidden />
              </div>
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">{module.eyebrow}</p>
              <h3 className="mt-1 text-sm font-semibold text-[var(--color-text)]">{module.title}</h3>
              <p className="mt-1.5 flex-1 text-xs leading-relaxed text-[var(--color-text-muted)]">{module.description}</p>
              <div className="mt-3 flex items-center justify-between gap-2 text-[11px]">
                <span className={module.ready ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}>{module.status}</span>
                <span className="font-semibold text-[var(--color-primary-h)] transition-transform group-hover:translate-x-0.5" aria-hidden>→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
