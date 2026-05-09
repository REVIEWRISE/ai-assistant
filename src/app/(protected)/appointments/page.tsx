import Link from "next/link";
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
      <section className="rounded-3xl border border-slate-200 bg-[linear-gradient(120deg,#0f172a,#1e293b_45%,#334155)] p-5 text-white shadow-sm lg:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">
          Appointment Agent
        </p>
        <h1 className="mt-2 text-2xl font-semibold leading-tight lg:text-3xl">
          Manage appointment modules and setup
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-200">
          Use these modules to configure organization context, build knowledge base, and monitor booking operations.
        </p>
        <p className="mt-3 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100">
          Active organization: {activeOrganization?.name ?? "Not selected"}
        </p>
      </section>

      <Panel title="Appointment Modules" subtitle="Choose a section to configure">
        <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-2 xl:grid-cols-4">
          <Link
            href="/appointments/overview"
            className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <p className="font-semibold text-slate-900">Overview</p>
            <p className="mt-1 text-xs text-slate-500">Track provider status, schedule signals, and booking flow.</p>
          </Link>
          <Link
            href="/appointments/organization"
            className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <p className="font-semibold text-slate-900">Organization</p>
            <p className="mt-1 text-xs text-slate-500">Manage active organization and workspace lifecycle.</p>
          </Link>
          <Link
            href="/appointments/knowledge-base"
            className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <p className="font-semibold text-slate-900">Knowledge Base</p>
            <p className="mt-1 text-xs text-slate-500">Import business context from your website, docs, and notes.</p>
          </Link>
          <Link
            href="/appointments/chatbot"
            className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <p className="font-semibold text-slate-900">Configure chatbot</p>
            <p className="mt-1 text-xs text-slate-500">Customize floating booking assistant text and services.</p>
          </Link>
        </div>
      </Panel>
    </div>
  );
}
