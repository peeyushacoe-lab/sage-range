"use client";

import { useState } from "react";

export function CopyFlagBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      onClick={copy}
      className="text-[10px] font-bold uppercase tracking-wider border rounded px-2 py-1 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
      style={copied
        ? { borderColor: "rgb(16 185 129 / 0.4)", color: "rgb(52 211 153)", background: "rgb(16 185 129 / 0.1)" }
        : { borderColor: "rgb(255 255 255 / 0.1)", color: "rgb(113 113 122)", background: "transparent" }
      }
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}
