import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  exchangeGoogleAuthCode,
  fetchGoogleAuthProfile,
  isGoogleAuthConfigured,
} from "@/lib/google-auth";
import {
  completeGoogleAuthLogin,
  decodeGoogleAuthState,
} from "@/lib/google-auth-session";
import { resetRateLimit } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request-ip";

export async function GET(request: Request) {
  if (!(await isGoogleAuthConfigured())) {
    redirect("/login?error=oauth_not_configured");
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const cookieStore = await cookies();
  const clearStateCookie = () => {
    cookieStore.set("google_auth_state", "", { maxAge: 0, path: "/" });
  };

  if (error) {
    clearStateCookie();
    redirect(error === "access_denied" ? "/login?error=oauth_denied" : "/login?error=oauth_failed");
  }

  if (!code || !state) {
    clearStateCookie();
    redirect("/login?error=oauth_failed");
  }

  const intent = decodeGoogleAuthState(state);
  const storedNonce = cookieStore.get("google_auth_state")?.value;
  if (!intent || !storedNonce || storedNonce !== intent.nonce) {
    clearStateCookie();
    redirect("/login?error=oauth_failed");
  }

  const tokenData = await exchangeGoogleAuthCode(code);
  const accessToken =
    tokenData && typeof tokenData.access_token === "string" ? tokenData.access_token : "";
  if (!accessToken) {
    clearStateCookie();
    redirect("/login?error=oauth_failed");
  }

  const profile = await fetchGoogleAuthProfile(accessToken);
  if (!profile) {
    clearStateCookie();
    redirect("/login?error=oauth_failed");
  }

  const result = await completeGoogleAuthLogin(profile, intent);
  clearStateCookie();

  if (!result.redirectTo.includes("error=")) {
    const ip = await getRequestIp();
    resetRateLimit(`login:${ip}`);
  }

  redirect(result.redirectTo);
}
