"use client";

import { useState } from "react";

export function CopyCodeBtn({ code }: { code: string }) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied("code");
    setTimeout(() => setCopied(null), 2000);
  }

  async function copyLink() {
    const url = `${window.location.origin}/classroom?join=${code}`;
    await navigator.clipboard.writeText(url);
    setCopied("link");
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={copyCode}
        className="font-mono text-sm text-sage-400 bg-sage-500/10 px-3 py-1 rounded border border-sage-500/20 tracking-widest hover:bg-sage-500/20 transition"
        title="Copy join code"
      >
        {code} {copied === "code" ? "✓" : "⎘"}
      </button>
      <button
        onClick={copyLink}
        className="text-xs font-semibold text-zinc-400 border border-white/10 px-3 py-1 rounded hover:text-zinc-200 hover:border-white/20 transition"
      >
        {copied === "link" ? "Copied ✓" : "Copy Invite Link"}
      </button>
    </div>
  );
}
