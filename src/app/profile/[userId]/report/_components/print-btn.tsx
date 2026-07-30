"use client";
export function PrintBtn() {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden rounded-xl bg-accent-fill text-white font-semibold px-5 py-2 text-sm hover:bg-accent-hover transition"
    >
      Print / Save as PDF
    </button>
  );
}
