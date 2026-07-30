"use client";

import { useState } from "react";

import { Icon } from "@/components/ui/icon";
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
        className="font-mono text-sm text-ok bg-ok-wash px-3 py-1 rounded border border-ok-edge tracking-widest hover:bg-ok-wash transition"
        title="Copy join code"
      >
        {code} {copied === "code" ? <Icon name="check" size={13} /> : "⎘"}
      </button>
      <button
        onClick={copyLink}
        className="text-xs font-semibold text-ink-2 border border-edge px-3 py-1 rounded hover:text-ink hover:border-edge-strong transition"
      >
        {copied === "link" ? <><Icon name="check" size={12} /> Copied</> : "Copy Invite Link"}
      </button>
    </div>
  );
}
