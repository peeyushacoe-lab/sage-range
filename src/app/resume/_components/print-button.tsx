"use client";


import { Icon } from "@/components/ui/icon";
export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-4 py-2 rounded-lg bg-ok text-white text-sm font-semibold hover:bg-ok-wash transition print:hidden"
    >
      <Icon name="download" size={14} className="inline-block" /> Download PDF
    </button>
  );
}
