import Link from "next/link";
import { PRODUCT_NAME } from "@/lib/brand";

export function LandingFooter({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-sm font-semibold text-white">{PRODUCT_NAME}</p>
          <p className="mt-1 text-xs text-zinc-500">AI for reviews, appointments, and leads</p>
        </div>
        <div className="flex flex-wrap gap-6 text-sm font-medium text-zinc-400">
          {isLoggedIn ? (
            <Link href="/dashboard" className="transition hover:text-white">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="transition hover:text-white">
                Sign in
              </Link>
              <Link href="/register" className="transition hover:text-white">
                Start free
              </Link>
            </>
          )}
          <a href="#features" className="transition hover:text-white">
            Features
          </a>
          <a href="#pricing" className="transition hover:text-white">
            Pricing
          </a>
        </div>
      </div>
    </footer>
  );
}
