import type { Metadata } from "next";
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
  description: "Dashboard for AI appointment, review response, and lead capture agents.",
  icons: {
    icon: BRAND_LOGO_PATH,
    apple: BRAND_LOGO_PATH,
  },
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} font-sans antialiased`}>
        <AppShell>{children}</AppShell>
        <AppToaster />
      </body>
    </html>
  );
}
