import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { KnowledgeBaseToasts } from "@/components/knowledge-base-toasts";
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
      <section className="rounded-3xl border border-slate-200 bg-[linear-gradient(120deg,#0f172a,#1e293b_45%,#334155)] p-5 text-white shadow-sm lg:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">
          Knowledge Base
        </p>
        <h1 className="mt-2 text-2xl font-semibold leading-tight lg:text-3xl">
          Build booking intelligence from your business content
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-200">
          Import your public website so AI understands your services and booking context.
        </p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Import from website</h2>
            <p className="text-sm text-slate-600">
              Add business context by importing your website URL.
            </p>
          </div>
          <div className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
            Auto-saved as Draft
          </div>
        </div>
        <KnowledgeImportSources
          organizationId={session.activeOrganization.id}
          organizationName={session.activeOrganization.name}
          onImportFromWebsite={importFromWebsite}
        />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Current Knowledge Draft</h2>
            <p className="text-sm text-slate-600">
              Active organization: <span className="font-semibold">{session.activeOrganization.name}</span>
            </p>
          </div>
          {session.activeOrganization.knowledgeBase ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <div
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                  session.activeOrganization.knowledgeBase.status === "approved"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                Status: {session.activeOrganization.knowledgeBase.status}
              </div>
              {session.activeOrganization.knowledgeBase.status !== "approved" ? (
                <form action={approveKnowledgeBase} className="inline-flex">
                  <input type="hidden" name="organization_id" value={session.activeOrganization.id} />
                  <button
                    type="submit"
                    className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 sm:text-sm sm:px-4 sm:py-2"
                  >
                    Approve for Agent
                  </button>
                </form>
              ) : null}
              <form action={clearKnowledgeBase} className="inline-flex">
                <input type="hidden" name="organization_id" value={session.activeOrganization.id} />
                <button
                  type="submit"
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 transition hover:bg-rose-100 sm:text-sm sm:px-4 sm:py-2"
                >
                  Clear Draft
                </button>
              </form>
            </div>
          ) : (
            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
              Status: empty
            </div>
          )}
        </div>

        {session.activeOrganization.knowledgeBase ? (
          <div className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-3 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-slate-500">Source Type</p>
                <p className="font-semibold text-slate-900">{session.activeOrganization.knowledgeBase.sourceType}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-slate-500">Last Imported</p>
                <p className="font-semibold text-slate-900">
                  {session.activeOrganization.knowledgeBase.lastImportedAt
                    ? new Date(session.activeOrganization.knowledgeBase.lastImportedAt).toLocaleString()
                    : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-slate-500">Source</p>
                <p className="font-semibold text-slate-900">
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
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
            No knowledge imported yet. Enter your website URL above to create a draft.
          </div>
        )}
      </section>
    </div>
  );
}
