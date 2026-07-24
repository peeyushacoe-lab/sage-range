"use client";

export function PrintBtn() {
  return (
    <button
      onClick={() => window.print()}
      className="text-sm text-zinc-400 border border-white/10 px-4 py-2 rounded-xl hover:text-white transition print:hidden"
    >
      Print / Save as PDF
    </button>
  );
}
