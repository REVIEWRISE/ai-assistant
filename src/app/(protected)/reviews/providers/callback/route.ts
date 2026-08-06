import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { listGoogleBusinessProfileLocationsWithResult } from "@/lib/google-business-profile";
import {
  asOAuthProviderConfig,
  exchangeAuthorizationCode,
} from "@/lib/google-oauth";
import { encryptTokenData } from "@/lib/token-encryption";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const REVIEWS_ROUTE = "/reviews";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    redirect(`${REVIEWS_ROUTE}?error=oauth_${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    redirect(`${REVIEWS_ROUTE}?error=oauth_missing`);
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get("oauth_state")?.value;

  if (!storedState || storedState !== state) {
    redirect(`${REVIEWS_ROUTE}?error=oauth_state`);
  }

  let statePayload: { providerId: string; userId: string; organizationId?: string } | null = null;
  try {
    statePayload = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
  } catch {
    redirect(`${REVIEWS_ROUTE}?error=oauth_state`);
  }

  if (!statePayload?.providerId || !statePayload.userId || !statePayload.organizationId) {
    redirect(`${REVIEWS_ROUTE}?error=oauth_state`);
  }

  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: statePayload.userId,
      organizationId: statePayload.organizationId,
    },
    select: { id: true },
  });
  if (!membership) {
    redirect(`${REVIEWS_ROUTE}?error=organization_required`);
  }

  const provider = await prisma.provider.findFirst({
    where: { id: statePayload.providerId, type: "review", status: "enabled" },
  });

  if (!provider) {
    redirect(`${REVIEWS_ROUTE}?error=provider_not_found`);
  }

  const config = asOAuthProviderConfig(provider.config);
  const tokenData = await exchangeAuthorizationCode({ config, code });
  if (!tokenData || typeof tokenData.access_token !== "string") {
    redirect(`${REVIEWS_ROUTE}?error=token_exchange`);
  }

  const accessToken = tokenData.access_token;
  const locationResult = await listGoogleBusinessProfileLocationsWithResult(accessToken);
  const locations = locationResult.locations;

  if (locations.length === 0) {
    await prisma.providerConnection.upsert({
      where: {
        userId_providerId: {
          userId: statePayload.userId,
          providerId: provider.id,
        },
      },
      create: {
        userId: statePayload.userId,
        providerId: provider.id,
        connected: false,
        tokenData: encryptTokenData(tokenData) as Prisma.InputJsonValue,
      },
      update: {
        connected: false,
        tokenData: encryptTokenData(tokenData) as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    });

    cookieStore.set("oauth_state", "", { maxAge: 0, path: "/" });
    const errorCode = locationResult.error ?? "no_locations";
    const detailQuery = locationResult.detail
      ? `&detail=${encodeURIComponent(locationResult.detail.slice(0, 240))}`
      : "";
    if (locationResult.detail) {
      console.error("[gbp-oauth] connect failed:", errorCode, locationResult.detail);
    }
    redirect(`${REVIEWS_ROUTE}?error=gbp_${errorCode}${detailQuery}`);
  }

  if (locations.length === 1) {
    const location = locations[0];
    const mergedTokenData = {
      ...tokenData,
      account_id: location.accountId,
      location_id: location.locationId,
      location_name: location.locationName,
      location_title: location.title,
    };

    await prisma.providerConnection.upsert({
      where: {
        userId_providerId: {
          userId: statePayload.userId,
          providerId: provider.id,
        },
      },
      create: {
        userId: statePayload.userId,
        providerId: provider.id,
        connected: true,
        tokenData: encryptTokenData(mergedTokenData) as Prisma.InputJsonValue,
      },
      update: {
        connected: true,
        tokenData: encryptTokenData(mergedTokenData) as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    });

    await prisma.auditEvent.create({
      data: {
        organizationId: statePayload.organizationId,
        actorId: statePayload.userId,
        action: "organization_review_provider_connected",
        metadata: {
          providerId: provider.id,
          providerName: provider.name,
          connectionUserId: statePayload.userId,
          accountId: location.accountId,
          locationId: location.locationId,
        },
      },
    });

    cookieStore.set("oauth_state", "", { maxAge: 0, path: "/" });
    redirect(`${REVIEWS_ROUTE}?success=provider_connected`);
  }

  await prisma.providerConnection.upsert({
    where: {
      userId_providerId: {
        userId: statePayload.userId,
        providerId: provider.id,
      },
    },
    create: {
      userId: statePayload.userId,
      providerId: provider.id,
      connected: false,
      tokenData: encryptTokenData(tokenData) as Prisma.InputJsonValue,
    },
    update: {
      connected: false,
      tokenData: encryptTokenData(tokenData) as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });

  cookieStore.set("oauth_state", "", { maxAge: 0, path: "/" });
  redirect(`/reviews/providers/select-location?providerId=${encodeURIComponent(provider.id)}`);
}
