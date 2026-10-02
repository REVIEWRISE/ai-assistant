import { cookies } from "next/headers";
import { isGoogleAuthConfigured } from "@/lib/google-auth";
import { LoginPageClient } from "./login-client";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const cookieStore = await cookies();
  const lastAuthProvider = cookieStore.get("last_auth_provider")?.value ?? null;
  const googleAuthEnabled = await isGoogleAuthConfigured();
  return (
    <LoginPageClient
      googleAuthEnabled={googleAuthEnabled}
      lastAuthProvider={lastAuthProvider}
    />
  );
}
