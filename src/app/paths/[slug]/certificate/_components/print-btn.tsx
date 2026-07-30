"use client";

export function PrintBtn() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print rounded-lg border border-white/10 px-5 py-2.5 text-sm font-semibold text-zinc-300 hover:border-sage-500/40 hover:text-sage-500 transition"
    >
      Print Certificate
    </button>
  );
}
