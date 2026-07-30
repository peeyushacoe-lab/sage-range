"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-zinc-950 text-white min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <p className="text-red-400 font-mono text-sm mb-3">ERR_{error.digest ?? "UNKNOWN"}</p>
          <h1 className="text-2xl font-bold mb-3">Something went wrong</h1>
          <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
            An unexpected error occurred. It has been reported automatically. Try refreshing, or go back to the dashboard.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={reset}
              className="rounded-lg bg-sage-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-sage-400 transition"
            >
              Try again
            </button>
            <Link
              href="/dashboard"
              className="rounded-lg border border-white/15 px-5 py-2.5 text-sm text-zinc-300 hover:text-white transition"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
