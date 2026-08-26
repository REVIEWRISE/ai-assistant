import Link from "next/link";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M21.6 12.3c0-.5-.1-1-.1-1.5H12v3.6h5.1c-.2 1.1-.9 2.1-1.9 2.8l2.9 2.2c1.7-1.6 2.5-3.9 2.5-7.1Z"
      />
      <path
        fill="#34A853"
        d="M12 21c2.4 0 4.4-.8 5.9-2.1l-2.9-2.2c-.8.5-1.8.9-3 .9a5.6 5.6 0 0 1-5.1-3.4L3.9 15.9C5.3 18.7 8.4 21 12 21Z"
      />
      <path
        fill="#FBBC05"
        d="M6.4 14a5.4 5.4 0 0 1-.5-2c0-.7.2-1.4.5-2L3.1 7.9A8.9 8.9 0 0 0 3 12c0 1.4.3 2.7.9 3.9L6.4 14Z"
      />
      <path
        fill="#EA4335"
        d="M12 3c2.5 0 4.5.8 5.9 2.2l-2.4 2.4C14.9 6.9 13.8 6.2 12 6.2A5.6 5.6 0 0 0 6.5 9.9L3.1 7.9C4.5 5 8 3 12 3Z"
      />
    </svg>
  );
}

export function GoogleAuthButton({
  enabled,
  label = "Continue with Google",
  plan,
  interval,
}: {
  enabled: boolean;
  label?: string;
  plan?: string;
  interval?: string;
}) {
  if (!enabled) return null;

  const qs = new URLSearchParams();
  if (plan) qs.set("plan", plan);
  if (interval === "monthly" || interval === "yearly") qs.set("interval", interval);
  const href = qs.size > 0 ? `/auth/google?${qs.toString()}` : "/auth/google";

  return (
    <div className="space-y-5">
      <Link
        href={href}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-6 text-sm font-semibold text-[var(--color-text)] shadow-sm transition hover:border-[var(--color-border-hover)] hover:bg-[var(--color-raised)]"
      >
        <GoogleIcon />
        {label}
      </Link>
      <div className="flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-[var(--color-border)]" />
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">or</span>
        <span className="h-px flex-1 bg-[var(--color-border)]" />
      </div>
    </div>
  );
}
