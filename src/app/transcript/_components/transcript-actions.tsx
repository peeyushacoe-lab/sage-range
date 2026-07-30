"use client";

import { useState } from "react";

import { Icon } from "@/components/ui/icon";
export function TranscriptActions() {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={copyLink}
        className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-zinc-300 hover:border-white/30 hover:text-white transition"
      >
        {copied ? <><Icon name="check" size={12} /> Copied</> : "Copy link"}
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
