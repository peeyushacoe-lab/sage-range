"use client";
export function PrintBtn() {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden rounded-xl bg-amber-500 text-black font-semibold px-5 py-2 text-sm hover:bg-amber-400 transition"
    >
      Print / Save as PDF
    </button>
  );
}
