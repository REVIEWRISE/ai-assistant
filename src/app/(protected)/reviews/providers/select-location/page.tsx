import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { listGoogleBusinessProfileLocationsWithResult } from "@/lib/google-business-profile";
import {
  asOAuthProviderConfig,
  getValidOAuthAccessToken,
} from "@/lib/google-oauth";
import { AppPageHero } from "@/components/app-page-hero";
import { completeReviewProviderLocation } from "../../actions";

export default async function SelectReviewProviderLocationPage({
  searchParams,
}: {
  searchParams?: Promise<{ providerId?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const providerId = String(params.providerId ?? "").trim();
  if (!providerId) redirect("/reviews?error=provider_missing");

  const cookieStore = await cookies();
  const token = cookieStore.get("ai_session")?.value;
  if (!token) redirect("/login");

  const session = await prisma.session.findFirst({
    where: { token, expiresAt: { gt: new Date() } },
    select: { userId: true, activeOrganizationId: true },
  });
  if (!session) redirect("/login");
  if (!session.activeOrganizationId) redirect("/reviews?error=organization_required");

  const provider = await prisma.provider.findFirst({
    where: { id: providerId, type: "review", status: "enabled" },
    select: { id: true, name: true, config: true },
  });
  if (!provider) redirect("/reviews?error=provider_not_found");

  const connection = await prisma.providerConnection.findUnique({
    where: { userId_providerId: { userId: session.userId, providerId: provider.id } },
    select: { tokenData: true },
  });
  if (!connection?.tokenData) redirect("/reviews?error=provider_not_connected");

  const config = asOAuthProviderConfig(provider.config);
  const tokenResult = await getValidOAuthAccessToken({
    config,
    tokenData: connection.tokenData,
    persist: async (next) => {
      await prisma.providerConnection.update({
        where: { userId_providerId: { userId: session.userId, providerId: provider.id } },
        data: { tokenData: next as Prisma.InputJsonValue, updatedAt: new Date() },
      });
    },
  });
  if ("error" in tokenResult) redirect("/reviews?error=token_refresh");

  const locationResult = await listGoogleBusinessProfileLocationsWithResult(tokenResult.accessToken);
  if (locationResult.locations.length === 0) {
    const errorCode = locationResult.error ?? "no_locations";
    redirect(`/reviews?error=gbp_${errorCode}`);
  }
  const locations = locationResult.locations;

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <AppPageHero
        eyebrow="Google Business Profile"
        title="Choose a business location"
        description={`Your Google account has access to multiple locations. Select which business profile to sync reviews from for ${provider.name}.`}
      />

      <section className="vr-app-panel p-5">
        <form action={completeReviewProviderLocation} className="space-y-3">
          <input type="hidden" name="provider_id" value={provider.id} />
          {locations.map((location) => (
            <label
              key={`${location.accountId}:${location.locationId}`}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--color-border)] px-4 py-3 transition hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface)]"
            >
              <input
                type="radio"
                name="location_key"
                value={`${location.accountId}::${location.locationId}::${encodeURIComponent(location.title)}::${encodeURIComponent(location.locationName)}`}
                required
                className="mt-1 accent-[var(--color-primary)]"
              />
              <span>
                <span className="block text-sm font-semibold text-[var(--color-text)]">{location.title}</span>
                <span className="mt-0.5 block text-xs text-[var(--color-text-muted)]">
                  Account {location.accountId} · Location {location.locationId}
                </span>
              </span>
            </label>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <Link
              href="/reviews"
              className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface)]"
            >
              Cancel
            </Link>
            <button type="submit" className="rounded-lg vr-btn-primary px-3 py-2 text-xs font-semibold">
              Connect location
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
