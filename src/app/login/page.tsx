import { isGoogleAuthConfigured } from "@/lib/google-auth";
import { LoginPageClient } from "./login-client";

export default async function LoginPage() {
  const googleAuthEnabled = await isGoogleAuthConfigured();
  return <LoginPageClient googleAuthEnabled={googleAuthEnabled} />;
}
