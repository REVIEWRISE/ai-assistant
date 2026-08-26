import { isGoogleAuthConfigured } from "@/lib/google-auth";
import { RegisterPageClient } from "./register-client";

export default async function RegisterPage() {
  const googleAuthEnabled = await isGoogleAuthConfigured();
  return <RegisterPageClient googleAuthEnabled={googleAuthEnabled} />;
}
