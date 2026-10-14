import { redirect } from "next/navigation";
import { readTwoFactorCookie } from "@/lib/two-factor";
import { VerifyLoginClient } from "./verify-client";

export const dynamic = "force-dynamic";

export default async function VerifyLoginPage() {
  if (!(await readTwoFactorCookie())) {
    redirect("/login?error=2fa_expired");
  }
  return <VerifyLoginClient />;
}
