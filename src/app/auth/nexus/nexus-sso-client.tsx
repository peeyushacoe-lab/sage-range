"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

export function NexusSsoClient() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setError("Missing token — this page should only be reached via a Nexus redirect.");
      return;
    }

    (async () => {
      const result = await signIn("nexus", { token, redirect: false });
      if (result?.error) {
        setError("Sign-in failed — your Nexus session may have expired. Please try again from Nexus.");
        return;
      }
      window.location.href = "/api/user/fix-session";
    })();
  }, [searchParams]);

  if (error) {
    return (
      <div className="max-w-sm mx-auto p-8 text-center">
        <p className="text-red-400 text-sm mb-4">{error}</p>
        <Link href="/sign-in" className="text-sage-400 hover:text-sage-300 text-sm">
          Go to sign-in →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto p-8 text-center">
      <div className="w-5 h-5 border-2 border-sage-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-zinc-400 text-sm">Signing you in via Nexus…</p>
    </div>
  );
}
