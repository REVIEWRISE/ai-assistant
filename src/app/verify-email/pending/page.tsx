import { VerifyEmailPendingClient } from "./verify-email-pending-client";

export default async function VerifyEmailPendingPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; error?: string; sent?: string }>;
}) {
  const params = await searchParams;
  return (
    <VerifyEmailPendingClient
      email={params.email?.trim() ?? ""}
      error={params.error?.trim() ?? ""}
      sent={params.sent === "1"}
    />
  );
}
