import { requireSession } from "@/lib/auth-session";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession();
  return children;
}
