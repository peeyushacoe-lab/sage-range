"use client";

import { useState } from "react";

export function CertActions({ sessionId }: { sessionId: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    const url = `${window.location.origin}/verify/simulation/${sessionId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openLinkedIn() {
    const url = `${window.location.origin}/verify/simulation/${sessionId}`;
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    window.open(shareUrl, "_blank", "noreferrer");
  }

  return (
    <div className="flex items-center gap-2 print:hidden flex-wrap">
      <button
        onClick={copyLink}
        className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-zinc-300 hover:border-white/30 hover:text-white transition"
      >
        {copied ? "Copied ✓" : "Copy Link"}
      </button>
      <button
        onClick={openLinkedIn}
        className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-400 hover:bg-blue-500/20 transition"
      >
        Share on LinkedIn
      </button>
      <button
        onClick={() => window.print()}
        className="rounded-lg bg-sage-500 text-black font-semibold px-5 py-2 text-sm hover:bg-sage-400 transition"
      >
        Print / PDF
      </button>
    </div>
  );
}
