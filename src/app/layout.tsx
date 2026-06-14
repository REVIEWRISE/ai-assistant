import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { BRAND_LOGO_PATH, PRODUCT_NAME } from "@/lib/brand";
import { Toaster } from "sonner";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
