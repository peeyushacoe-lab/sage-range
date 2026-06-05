"use client";

import { useState } from "react";

export function CopyCodeBtn({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={copy}
      className="text-xs px-2 py-1 rounded border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 font-mono transition"
    >
      {copied ? "Copied!" : code}
    </button>
  );
}
