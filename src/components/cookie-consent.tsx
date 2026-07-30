"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const STORAGE_KEY = "sage_cookie_consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) setVisible(true);
    } catch {
      // localStorage blocked (private browsing etc.) — don't show
    }
  }, []);

  function accept() {
    try { localStorage.setItem(STORAGE_KEY, "accepted"); } catch { /* ignore */ }
    setVisible(false);
  }

  function decline() {
    try { localStorage.setItem(STORAGE_KEY, "declined"); } catch { /* ignore */ }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pointer-events-none">
      <div className="max-w-3xl mx-auto bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl p-5 pointer-events-auto">
        <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white mb-1">
              Cookies &amp; Privacy
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              We use essential cookies for authentication and session management.
              No advertising or tracking cookies.{" "}
              <Link href="/legal/privacy" className="text-sage-400 hover:underline">
                Privacy Policy
              </Link>
              {" · "}
              <Link href="/legal/terms" className="text-sage-400 hover:underline">
                Terms
              </Link>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-1 sm:mt-0">
            <button
              onClick={decline}
              className="rounded-lg border border-white/10 px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:border-white/20 transition"
            >
              Decline
            </button>
            <button
              onClick={accept}
              className="rounded-lg bg-sage-500 px-4 py-2 text-xs font-semibold text-black hover:bg-sage-400 transition"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
