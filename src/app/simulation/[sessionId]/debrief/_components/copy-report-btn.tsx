"use client";

import { useState } from "react";

interface CopyReportBtnProps {
  report: string;
}

export function CopyReportBtn({ report }: CopyReportBtnProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for environments without clipboard API
      const textarea = document.createElement("textarea");
      textarea.value = report;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="text-xs px-3 py-1.5 rounded border border-white/10 text-zinc-400 hover:text-white hover:border-white/30 transition-colors"
    >
      {copied ? "Copied!" : "Copy Report"}
    </button>
  );
}
