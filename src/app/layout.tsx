import type { Metadata } from "next";
import { Suspense } from "react";
import localFont from "next/font/local";
import { AppShell } from "@/components/app-shell";
import { AppToaster } from "@/components/app-toaster";
import { BRAND_LOGO_PATH, PRODUCT_NAME } from "@/lib/brand";
import "./globals.css";

const poppins = localFont({
  src: [
    {
      path: "../fonts/poppins/poppins-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/poppins/poppins-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/poppins/poppins-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../fonts/poppins/poppins-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: PRODUCT_NAME,
  description: "AI operations for reviews, appointments, and leads—one intelligent workspace for faster customer action.",
  icons: {
    icon: BRAND_LOGO_PATH,
    apple: BRAND_LOGO_PATH,
  },
  openGraph: {
    title: PRODUCT_NAME,
    description: "Turn every customer message into the next action with AI-powered reviews, bookings, and lead follow-up.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: PRODUCT_NAME,
    description: "AI operations for reviews, appointments, and leads.",
  },
};

const themeInitializer = `
  (function () {
    var root = document.documentElement;
    try {
      if (location.pathname.indexOf("/embed") === 0) {
        // Embedded on a customer's site: the visitor's OS dark mode must not decide the look.
        // Light by default; the site owner can add &theme=dark. color-scheme "normal" keeps the
        // iframe transparent: browsers paint an opaque backdrop when it differs from the host page.
        root.dataset.theme = new URLSearchParams(location.search).get("theme") === "dark" ? "dark" : "light";
        root.style.colorScheme = "normal";
        return;
      }
      var stored = localStorage.getItem("vyntrise-theme");
      var theme = stored === "light" || stored === "dark"
        ? stored
        : (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      root.dataset.theme = theme;
      root.style.colorScheme = theme;
    } catch (_) {
      root.dataset.theme = "light";
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitializer }} />
      </head>
      <body className={`${poppins.variable} font-sans antialiased`}>
        <Suspense fallback={null}>
          <AppShell>{children}</AppShell>
        </Suspense>
        <AppToaster />
      </body>
    </html>
  );
}
