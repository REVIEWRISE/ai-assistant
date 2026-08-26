import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  buildGoogleAuthUrl,
  isGoogleAuthConfigured,
} from "@/lib/google-auth";
import { encodeGoogleAuthState } from "@/lib/google-auth-session";
import { checkLoginRateLimit } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request-ip";

export async function GET(request: Request) {
  if (!(await isGoogleAuthConfigured())) {
    redirect("/login?error=oauth_not_configured");
  }

  const ip = await getRequestIp();
  const rl = checkLoginRateLimit(ip);
  if (!rl.allowed) {
    const minutes = Math.ceil(rl.retryAfterMs / 60000);
    redirect(`/login?error=rate_limited&retry=${minutes}`);
  }

  const { searchParams } = new URL(request.url);
  const plan = searchParams.get("plan")?.trim() || undefined;
  const intervalRaw = searchParams.get("interval")?.trim();
  const interval =
    intervalRaw === "monthly" || intervalRaw === "yearly" ? intervalRaw : undefined;

  const nonce = crypto.randomUUID();
  const state = encodeGoogleAuthState({ nonce, plan, interval });
  const authUrl = await buildGoogleAuthUrl(state);
  if (!authUrl) {
    redirect("/login?error=oauth_not_configured");
  }

  const cookieStore = await cookies();
  cookieStore.set("google_auth_state", nonce, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    sameSite: "lax",
  });

  redirect(authUrl);
}
