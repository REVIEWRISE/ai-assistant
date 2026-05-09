import { Badge, Panel } from "@/components/ui";

const liveVisitors = [
  {
    id: "Visitor #2041",
    intent: "Asking about enterprise pricing",
    score: "High intent",
    tone: "bg-emerald-50 text-emerald-700",
  },
  {
    id: "Visitor #2047",
    intent: "Asking for weekend availability",
    score: "Medium intent",
    tone: "bg-amber-50 text-amber-700",
  },
  {
    id: "Visitor #2052",
    intent: "Comparing onboarding timelines",
    score: "High intent",
    tone: "bg-emerald-50 text-emerald-700",
  },
];

const funnel = [
  { label: "Visitors", value: "1,240", tone: "bg-slate-100 text-slate-700" },
  { label: "Chats", value: "386", tone: "bg-sky-50 text-sky-700" },
  { label: "Qualified", value: "144", tone: "bg-amber-50 text-amber-700" },
  { label: "Booked", value: "62", tone: "bg-emerald-50 text-emerald-700" },
];

export default function LeadsPage() {
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-[linear-gradient(120deg,#0f172a,#1e293b_45%,#334155)] p-5 text-white shadow-sm lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">
              Lead Capture Chatbot
            </p>
            <h1 className="mt-2 text-2xl font-semibold leading-tight lg:text-3xl">
              Convert visitors into qualified opportunities automatically.
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-200">
              AI is qualifying inbound leads in real time, collecting core deal
              context, and routing high-value prospects to human reps with CRM
              sync and response SLAs.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Open Live Chat
            </button>
            <button
              type="button"
              className="rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Export Leads
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-7">
        <div className="space-y-4 xl:col-span-3">
          <Panel
            title="Live Chat Monitor"
            subtitle="Active visitors with qualification signals"
          >
            <div className="space-y-3 text-sm text-slate-700">
              {liveVisitors.map((visitor) => (
                <div
                  key={visitor.id}
                  className="rounded-xl border border-slate-200 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{visitor.id}</p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${visitor.tone}`}
                    >
                      {visitor.score}
                    </span>
                  </div>
                  <p className="mt-1">{visitor.intent}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="CRM Sync" subtitle="Lead handoff across sales systems">
            <div className="space-y-3 text-sm text-slate-700">
              <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <p className="font-medium text-slate-900">HubSpot</p>
                <span className="text-xs font-semibold text-emerald-700">
                  100% synced
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="font-medium text-slate-900">Salesforce</p>
                <span className="text-xs font-semibold text-amber-700">
                  2 records pending retry
                </span>
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-4 xl:col-span-4">
          <Panel
            title="Qualification Flow"
            subtitle="AI playbook, gating rules, and rep handoff"
          >
            <div className="grid gap-3 sm:grid-cols-3 text-sm text-slate-700">
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="font-semibold text-slate-900">1. Context Capture</p>
                <p className="mt-1">
                  Ask service category, company size, and desired timeline.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="font-semibold text-slate-900">2. Qualification</p>
                <p className="mt-1">
                  Capture budget range, urgency, and decision-maker status.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="font-semibold text-slate-900">3. Handoff</p>
                <p className="mt-1">
                  Route qualified leads to a human rep in under 2 minutes.
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Edit Playbook
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Test Chat Flow
              </button>
            </div>
          </Panel>

          <Panel title="Lead Funnel" subtitle="Visitors to booked appointments">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 text-sm text-slate-700">
              {funnel.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-slate-200 p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-medium text-slate-900">{item.label}</p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.tone}`}
                    >
                      {item.value}
                    </span>
                  </div>
                  <Badge>Tracked</Badge>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </section>
    </div>
  );
}
