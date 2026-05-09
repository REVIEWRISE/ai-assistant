"use client";

import { useFormStatus } from "react-dom";

type CalendarRouteOption = {
  providerId: string;
  connectionUserId: string;
  providerName: string;
};

type BookedCalendarSyncFormProps = {
  appointmentId: string;
  routes: CalendarRouteOption[];
  providerSyncStatus: string;
  externalCalendarEventId: string | null;
  providerSyncError: string | null;
  routedProviderId: string | null;
  routedConnectionUserId: string | null;
  action: (formData: FormData) => void | Promise<void>;
};

function routeValue(r: CalendarRouteOption): string {
  return `${r.providerId}::${r.connectionUserId}`;
}

function SubmitButton({ singleRoute }: { singleRoute: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Posting…" : singleRoute ? "Post to calendar" : "Post with selected calendar"}
    </button>
  );
}

export function BookedCalendarSyncForm({
  appointmentId,
  routes,
  providerSyncStatus,
  externalCalendarEventId,
  providerSyncError,
  routedProviderId,
  routedConnectionUserId,
  action,
}: BookedCalendarSyncFormProps) {
  const synced = Boolean(externalCalendarEventId && providerSyncStatus === "synced");

  const preferredKey =
    routedProviderId && routedConnectionUserId
      ? `${routedProviderId}::${routedConnectionUserId}`
      : null;
  const preferredOk =
    preferredKey && routes.some((r) => routeValue(r) === preferredKey) ? preferredKey : null;
  const defaultRouteKey = preferredOk ?? (routes[0] ? routeValue(routes[0]) : "");

  if (synced) {
    return <p className="mt-2 text-xs font-medium text-emerald-700">On connected calendar.</p>;
  }

  if (routes.length === 0) {
    return (
      <p className="mt-2 text-xs text-amber-900">
        Connect a calendar under the <span className="font-semibold">Integrations</span> tab to post this booking.
      </p>
    );
  }

  return (
    <form action={action} className="mt-2 space-y-2">
      <input type="hidden" name="appointment_id" value={appointmentId} />
      {routes.length > 1 ? (
        <label className="flex max-w-md flex-col text-xs font-semibold text-slate-600">
          Post using calendar
          <select
            name="route_key"
            defaultValue={defaultRouteKey}
            className="mt-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm font-medium text-slate-800"
          >
            {routes.map((r) => (
              <option key={routeValue(r)} value={routeValue(r)}>
                {r.providerName}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="route_key" value={defaultRouteKey} />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton singleRoute={routes.length === 1} />
        <span className="text-[11px] text-slate-500">Creates an event on the chosen provider.</span>
      </div>
      {providerSyncError ? (
        <p className="text-xs text-rose-600" title={providerSyncError}>
          Last error: {providerSyncError.length > 160 ? `${providerSyncError.slice(0, 160)}…` : providerSyncError}
        </p>
      ) : null}
    </form>
  );
}
