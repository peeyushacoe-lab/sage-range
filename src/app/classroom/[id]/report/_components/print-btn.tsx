"use client";

export function PrintBtn() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-lg bg-sage-500 px-4 py-2 text-sm font-semibold text-black hover:bg-sage-700 hover:text-white transition print:hidden"
    >
      Print Report
    </button>
  );
}
