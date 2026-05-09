import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type ProviderConfig = {
  auth_url?: string;
  client_id?: string;
  redirect_uri?: string;
  scopes?: string | string[];
  scope?: string;
};

function buildAuthUrl(baseUrl: string, params: Record<string, string>) {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("ai_session")?.value;

  if (!token) {
    redirect("/login");
  }

  const session = await prisma.session.findFirst({
    where: { token, expiresAt: { gt: new Date() } },
    select: { userId: true, activeOrganizationId: true },
  });

  if (!session) {
    redirect("/login");
  }

  if (!session.activeOrganizationId) {
    redirect("/appointments?error=organization_required");
  }

  const provider = await prisma.provider.findFirst({
    where: { id, type: "calendar", status: "enabled" },
  });

  if (!provider) {
    redirect("/appointments?error=provider_not_found");
  }

  const config = (provider.config ?? {}) as ProviderConfig;
  const authUrl = config.auth_url?.trim();
  const clientId = config.client_id?.trim();
  const redirectUri = config.redirect_uri?.trim();
  const scopesValue = config.scopes ?? config.scope;

  const scopes =
    Array.isArray(scopesValue)
      ? scopesValue.join(" ")
      : typeof scopesValue === "string"
        ? scopesValue
            .split(",")
            .map((scope) => scope.trim())
            .filter(Boolean)
            .join(" ")
        : "";

  if (!authUrl || !clientId || !redirectUri || !scopes) {
    redirect("/appointments?error=provider_config");
  }

  const statePayload = {
    providerId: provider.id,
    userId: session.userId,
    organizationId: session.activeOrganizationId,
    ts: Date.now(),
    nonce: crypto.randomUUID(),
  };
  const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url");
  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  const authRedirect = buildAuthUrl(authUrl, {
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
    state,
  });

  redirect(authRedirect);
}
