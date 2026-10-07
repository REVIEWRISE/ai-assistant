import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const AUTH_COOKIE = "ai_session";
const AUTH_ROUTES = new Set([
  "/login",
  "/register",
  "/logout",
  "/forgot-password",
  "/reset-password",
]);

function isPublicAuthFlowPath(pathname: string): boolean {
  return (
    AUTH_ROUTES.has(pathname) ||
    pathname === "/login/verify" ||
    pathname === "/verify-email" ||
    pathname.startsWith("/verify-email/") ||
    pathname === "/auth/google" ||
    pathname.startsWith("/auth/google/") ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/forgot-password/") ||
    pathname === "/reset-password" ||
    pathname.startsWith("/reset-password/")
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/embed") ||
    pathname === "/favicon.ico" ||
    /\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const isAuthRoute = isPublicAuthFlowPath(pathname);
  const isAuthed = Boolean(request.cookies.get(AUTH_COOKIE)?.value);
  const isPublicLanding = pathname === "/";

  if (!isAuthed && !isAuthRoute && !isPublicLanding) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: "/:path*",
};
