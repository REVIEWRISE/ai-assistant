import Link from "next/link";
import { AppointmentPageHeader } from "@/components/appointment-page-header";

export function WorkspaceRequiredPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-[92rem] space-y-4">
      <AppointmentPageHeader
        variant="command"
        title={title}
        description={description}
        status="Workspace required"
        statusTone="warning"
        actions={[
          {
            href: "/appointments/organization",
            label: "Choose workspace",
            primary: true,
          },
        ]}
        metrics={[
          { label: "Workspace", value: "Not selected" },
          { label: "Header", value: "Pick one org", hint: "All workspaces is for admin ops only" },
        ]}
      />
      <section className="rounded-[1.35rem] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center shadow-[var(--shadow-sm)]">
        <p className="text-sm font-semibold text-[var(--color-text)]">
          Select a specific workspace first
        </p>
        <p className="mx-auto mt-1 max-w-xl text-xs leading-relaxed text-[var(--color-text-muted)]">
          Appointments, reviews, and voice run per customer workspace. Use the header selector (or the
          organization page) to pick one — All workspaces stays available for platform admin screens.
        </p>
        <Link
          href="/appointments/organization"
          className="mt-4 inline-flex rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-[var(--color-primary-fg)] shadow-[var(--shadow-sm)] transition hover:opacity-90"
        >
          Open organization picker
        </Link>
      </section>
    </div>
  );
}
