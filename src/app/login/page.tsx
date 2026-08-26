import { isGoogleAuthConfigured } from "@/lib/google-auth";
import { LoginPageClient } from "./login-client";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const googleAuthEnabled = await isGoogleAuthConfigured();
  return <LoginPageClient googleAuthEnabled={googleAuthEnabled} />;
}
