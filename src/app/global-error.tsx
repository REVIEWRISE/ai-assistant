"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: "2rem", textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
          <div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Something went wrong</h1>
            <p style={{ marginTop: "0.5rem", color: "#6b7280" }}>
              The error has been reported. Please try refreshing the page.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
