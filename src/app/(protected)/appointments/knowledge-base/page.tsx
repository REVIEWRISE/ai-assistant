import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { KnowledgeBaseToasts } from "@/components/knowledge-base-toasts";
import { AppPageHero } from "@/components/app-page-hero";
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

  return (
    <div className="space-y-5">
      <KnowledgeBaseToasts />
      <AppPageHero
        eyebrow="Knowledge Base"
        title={
          <>
            Build booking intelligence from your{" "}
            <span className="vr-brand-gradient-text">business content</span>
          </>
        }
        description="Import your public website so AI understands your services and booking context."
      />

      <section className="vr-app-panel p-5 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Import from website</h2>
            <p className="text-sm text-[var(--color-text-muted)]">
              Add business context by importing your website URL.
            </p>
          </div>
          <div className="inline-flex rounded-full border border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-primary-h)]">
            Auto-saved as Draft
          </div>
        </div>
        <KnowledgeImportSources
          organizationId={session.activeOrganization.id}
          organizationName={session.activeOrganization.name}
          onImportFromWebsite={importFromWebsite}
        />
      </section>

      <section className="vr-app-panel p-5 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Current Knowledge Draft</h2>
            <p className="text-sm text-[var(--color-text-muted)]">
              Active organization: <span className="font-semibold text-[var(--color-text)]">{session.activeOrganization.name}</span>
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
                  className="rounded-xl border border-[color-mix(in_srgb,var(--color-danger)_35%,var(--color-border))] bg-[var(--color-danger-soft)] px-3 py-1.5 text-xs font-semibold text-[color-mix(in_srgb,var(--color-danger)_85%,var(--color-text))] transition hover:brightness-95 sm:text-sm sm:px-4 sm:py-2"
                >
                  Clear Draft
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
          <div className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-3 text-xs">
              <div className="vr-app-meta-cell">
                <p className="text-[var(--color-text-muted)]">Source Type</p>
                <p className="font-semibold text-[var(--color-text)]">{session.activeOrganization.knowledgeBase.sourceType}</p>
              </div>
              <div className="vr-app-meta-cell">
                <p className="text-[var(--color-text-muted)]">Last Imported</p>
                <p className="font-semibold text-[var(--color-text)]">
                  {session.activeOrganization.knowledgeBase.lastImportedAt
                    ? new Date(session.activeOrganization.knowledgeBase.lastImportedAt).toLocaleString()
                    : "—"}
                </p>
              </div>
              <div className="vr-app-meta-cell">
                <p className="text-[var(--color-text-muted)]">Source</p>
                <p className="font-semibold text-[var(--color-text)]">
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
          <div className="mt-4 vr-app-empty-state p-5 text-sm">
            No knowledge imported yet. Enter your website URL above to create a draft.
          </div>
        )}
      </section>
    </div>
  );
}
