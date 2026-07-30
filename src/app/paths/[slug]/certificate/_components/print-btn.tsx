"use client";

export function PrintBtn() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print rounded-lg border border-edge px-5 py-2.5 text-sm font-semibold text-ink-2 hover:border-ok-edge hover:text-ok transition"
    >
      Print Certificate
    </button>
  );
}
