"use client";

export function PrintBtn() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-lg bg-accent-fill px-4 py-2 text-sm font-semibold text-white hover:bg-ok-wash hover:text-white transition print:hidden"
    >
      Print Report
    </button>
  );
}
