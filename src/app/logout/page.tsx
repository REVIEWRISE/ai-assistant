"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    document.cookie = "ai_session=; Max-Age=0; path=/; SameSite=Lax";
    router.replace("/login");
  }, [router]);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md items-center justify-center text-sm text-slate-600">
      Signing you out...
    </div>
  );
}
