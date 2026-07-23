import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { KnowledgeBaseToasts } from "@/components/knowledge-base-toasts";
import { AppointmentPageHeader } from "@/components/appointment-page-header";
import { KnowledgeImportSources } from "@/components/knowledge-import-sources";
import { KnowledgePreview } from "@/components/knowledge-preview";
import { KnowledgeBaseAppendNotes } from "@/components/knowledge-base-append-notes";
import {
  appendKnowledgeBaseNotes,
  approveKnowledgeBase,
  clearKnowledgeBase,
  importFromWebsite,
} from "./actions";

export default async function AppointmentKnowledgeBasePage() {
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
          knowledgeBase: true,
        },
      },
    },
  });

  if (!session) {
    redirect("/login");
  }

  if (!session.activeOrganization) {
    redirect("/appointments");
  }

  const parsedData = session.activeOrganization.knowledgeBase?.parsedData;
  const formattedPreview =
    parsedData &&
    typeof parsedData === "object" &&
    !Array.isArray(parsedData) &&
    "formattedPreview" in parsedData &&
    typeof parsedData.formattedPreview === "string"
      ? parsedData.formattedPreview
      : "";
  const knowledgeBase = session.activeOrganization.knowledgeBase;
  const knowledgeStatus = knowledgeBase?.status ?? "empty";
  const lastImported = knowledgeBase?.lastImportedAt
    ? new Date(knowledgeBase.lastImportedAt).toLocaleDateString()
    : "Never";
  const knowledgeCharacters = String(knowledgeBase?.rawText ?? "").length;

  return (
    <div className="mx-auto max-w-[92rem] space-y-5">
      <KnowledgeBaseToasts />
      <AppointmentPageHeader
        variant="command"
        title="Booking knowledge"
        description={<>Import and approve the business information the agent uses for services, policies, and booking answers.</>}
        status={knowledgeStatus === "approved" ? "Approved for agent" : knowledgeStatus === "draft" ? "Draft needs approval" : "Knowledge required"}
        statusTone={knowledgeStatus === "approved" ? "success" : "warning"}
        actions={knowledgeStatus === "approved" ? [{ href: "/appointments/chatbot", label: "Configure assistant", primary: true }] : []}
        metrics={[
          { label: "Organization", value: session.activeOrganization.name },
          { label: "Status", value: knowledgeStatus },
          { label: "Last imported", value: lastImported },
          { label: "Stored content", value: knowledgeCharacters.toLocaleString(), hint: "characters" },
        ]}
      />

      <section className="overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-md)]">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--color-border)] px-5 py-5 lg:px-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">Build knowledge</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-[var(--color-text)]">Import business website</h2>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Re-importing refreshes the current draft for {session.activeOrganization.name}.
            </p>
          </div>
          <div className="inline-flex rounded-full border border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] bg-[var(--color-primary-soft)] px-3 py-1 text-[10px] font-semibold text-[var(--color-primary-h)]">
            Imports save as draft
          </div>
        </div>
        <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_19rem] lg:p-6">
          <KnowledgeImportSources
            organizationId={session.activeOrganization.id}
            organizationName={session.activeOrganization.name}
            onImportFromWebsite={importFromWebsite}
          />
          <aside className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">Publishing workflow</p>
            <div className="mt-4 space-y-4">
              {[
                ["1", "Import", "Capture public business content"],
                ["2", "Review", "Check the generated digest and source"],
                ["3", "Approve", "Make the knowledge available to the agent"],
              ].map(([step, label, description]) => (
                <div key={step} className="flex gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-semibold text-[var(--color-primary-h)]">
                    {step}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-[var(--color-text)]">{label}</p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--color-text-muted)]">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-md)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border)] px-5 py-5 lg:px-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary-h)]">Agent context</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-[var(--color-text)]">Current knowledge</h2>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Review the imported content before allowing the booking agent to use it.
            </p>
          </div>
          {session.activeOrganization.knowledgeBase ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  session.activeOrganization.knowledgeBase.status === "approved"
                    ? "vr-app-status-success"
                    : "vr-app-status-muted"
                }`}
              >
                Status: {session.activeOrganization.knowledgeBase.status}
              </span>
              {session.activeOrganization.knowledgeBase.status !== "approved" ? (
                <form action={approveKnowledgeBase} className="inline-flex">
                  <input type="hidden" name="organization_id" value={session.activeOrganization.id} />
                  <button
                    type="submit"
                    className="rounded-xl vr-btn-primary px-3 py-1.5 text-xs font-semibold sm:text-sm sm:px-4 sm:py-2"
                  >
                    Approve for Agent
                  </button>
                </form>
              ) : null}
              <form action={clearKnowledgeBase} className="inline-flex">
                <input type="hidden" name="organization_id" value={session.activeOrganization.id} />
                <button
                  type="submit"
                  className="group inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-muted)] shadow-[var(--shadow-xs)] transition hover:border-[color-mix(in_srgb,var(--color-danger)_35%,var(--color-border))] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)] sm:px-4 sm:py-2 sm:text-sm"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-4"
                  >
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v5M14 11v5" />
                  </svg>
                  Clear knowledge
                </button>
              </form>
            </div>
          ) : (
            <div className="inline-flex rounded-full vr-app-status-muted px-3 py-1 text-xs font-semibold">
              Status: empty
            </div>
          )}
        </div>

        {session.activeOrganization.knowledgeBase ? (
          <div className="space-y-4 p-5 lg:p-6">
            <div className="grid gap-3 text-xs sm:grid-cols-3">
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Source type</p>
                <p className="mt-1.5 font-semibold capitalize text-[var(--color-text)]">{session.activeOrganization.knowledgeBase.sourceType}</p>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Last imported</p>
                <p className="mt-1.5 font-semibold text-[var(--color-text)]">
                  {session.activeOrganization.knowledgeBase.lastImportedAt
                    ? new Date(session.activeOrganization.knowledgeBase.lastImportedAt).toLocaleString()
                    : "—"}
                </p>
              </div>
              <div className="min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Source</p>
                <p className="mt-1.5 truncate font-semibold text-[var(--color-text)]">
                  {session.activeOrganization.knowledgeBase.sourceUrl ??
                    session.activeOrganization.knowledgeBase.sourceFileName ??
                    "Manual notes"}
                </p>
              </div>
            </div>

            <KnowledgePreview
              rawText={String(session.activeOrganization.knowledgeBase.rawText ?? "")}
              formattedPreview={formattedPreview}
            />

            <KnowledgeBaseAppendNotes
              organizationId={session.activeOrganization.id}
              onAppendNotes={appendKnowledgeBaseNotes}
            />
          </div>
        ) : (
          <div className="p-5 lg:p-6">
            <div className="flex min-h-[150px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border-hover)] bg-[linear-gradient(145deg,var(--color-bg),var(--color-surface))] px-5 py-7 text-center">
              <span className="mb-2.5 flex size-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-semibold text-[var(--color-primary-h)] shadow-[var(--shadow-sm)]" aria-hidden>K</span>
              <p className="text-sm font-semibold text-[var(--color-text)]">No knowledge imported yet</p>
              <p className="mt-1 max-w-lg text-xs leading-relaxed text-[var(--color-text-muted)]">Enter the business website above to create the first reviewable draft for the booking agent.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
