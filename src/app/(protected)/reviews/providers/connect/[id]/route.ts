import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import {
  asOAuthProviderConfig,
  buildAuthUrl,
  parseOAuthScopes,
} from "@/lib/google-oauth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { userHasAdminRole } from "@/lib/admin-view-only";

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
  if (await userHasAdminRole(session.userId)) {
    redirect("/reviews?error=review_read_only");
  }

  if (!session.activeOrganizationId) {
    redirect("/reviews?error=organization_required");
  }

  const provider = await prisma.provider.findFirst({
    where: { id, type: "review", status: "enabled" },
  });

  if (!provider) {
    redirect("/reviews?error=provider_not_found");
  }

  const config = asOAuthProviderConfig(provider.config);
  const authUrl = config.auth_url?.trim();
  const clientId = config.client_id?.trim();
  const redirectUri = config.redirect_uri?.trim();
  const scopes = parseOAuthScopes(config);

  if (!authUrl || !clientId || !redirectUri || !scopes) {
    redirect("/reviews?error=provider_config");
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
