"use client";

import { useState } from "react";

import { Icon } from "@/components/ui/icon";
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
        className="rounded-lg border border-edge-strong px-4 py-2 text-sm font-semibold text-ink-2 hover:border-edge-strong hover:text-white transition"
      >
        {copied ? <><Icon name="check" size={12} /> Copied</> : "Copy Link"}
      </button>
      <button
        onClick={openLinkedIn}
        className="rounded-lg border border-info-edge bg-info-wash px-4 py-2 text-sm font-semibold text-info hover:bg-info-wash transition"
      >
        Share on LinkedIn
      </button>
      <button
        onClick={() => window.print()}
        className="rounded-lg bg-accent-fill text-white font-semibold px-5 py-2 text-sm hover:bg-accent-hover transition"
      >
        Print / PDF
      </button>
    </div>
  );
}
