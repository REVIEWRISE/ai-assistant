import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type ProviderConfig = {
  token_url?: string;
  client_id?: string;
  client_secret?: string;
  redirect_uri?: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    redirect(`/appointments?error=oauth_${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    redirect("/appointments?error=oauth_missing");
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get("oauth_state")?.value;

  if (!storedState || storedState !== state) {
    redirect("/appointments?error=oauth_state");
  }

  let statePayload: { providerId: string; userId: string; organizationId?: string } | null = null;
  try {
    statePayload = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
  } catch {
    redirect("/appointments?error=oauth_state");
  }

  if (!statePayload?.providerId || !statePayload.userId || !statePayload.organizationId) {
    redirect("/appointments?error=oauth_state");
  }

  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: statePayload.userId,
      organizationId: statePayload.organizationId,
    },
    select: { id: true },
  });
  if (!membership) {
    redirect("/appointments?error=organization_required");
  }

  const provider = await prisma.provider.findFirst({
    where: { id: statePayload.providerId, type: "calendar", status: "enabled" },
  });

  if (!provider) {
    redirect("/appointments?error=provider_not_found");
  }

  const config = (provider.config ?? {}) as ProviderConfig;
  const tokenUrl = config.token_url?.trim();
  const clientId = config.client_id?.trim();
  const clientSecret = config.client_secret?.trim();
  const redirectUri = config.redirect_uri?.trim();

  if (!tokenUrl || !clientId || !clientSecret || !redirectUri) {
    redirect("/appointments?error=provider_config");
  }

  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    redirect("/appointments?error=token_exchange");
  }

  const tokenData = await tokenResponse.json();
  if (tokenData && typeof tokenData.expires_in === "number") {
    tokenData.expires_at = Date.now() + tokenData.expires_in * 1000;
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
      connected: true,
      tokenData,
    },
    update: {
      connected: true,
      tokenData,
      updatedAt: new Date(),
    },
  });

  await prisma.auditEvent.create({
    data: {
      organizationId: statePayload.organizationId,
      actorId: statePayload.userId,
      action: "organization_calendar_provider_connected",
      metadata: {
        providerId: provider.id,
        providerName: provider.name,
        connectionUserId: statePayload.userId,
      },
    },
  });

  cookieStore.set("oauth_state", "", { maxAge: 0, path: "/" });
  redirect("/appointments?success=provider_connected");
}
