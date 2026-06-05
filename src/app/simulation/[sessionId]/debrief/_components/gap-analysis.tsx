import Link from "next/link";

type GapData = {
  weakestArea: string;
  gapSummary: string;
  recommendedLabs: string;
  recommendedPaths: string;
  nextSimulation: string;
};

const ITEMS: { key: keyof GapData; emoji: string; label: string }[] = [
  { key: "weakestArea", emoji: "🎯", label: "Weakest Area" },
  { key: "gapSummary", emoji: "📊", label: "Gap Summary" },
  { key: "recommendedLabs", emoji: "🧪", label: "Recommended Labs" },
  { key: "recommendedPaths", emoji: "🛤️", label: "Recommended Paths" },
  { key: "nextSimulation", emoji: "⚡", label: "Next Simulation" },
];

export function GapAnalysis({ gap }: { gap: GapData }) {
  return (
    <section className="mt-12 border-t border-white/10 pt-10">
      <h2 className="text-sm uppercase tracking-widest text-zinc-500 mb-4">Personalized Training Plan</h2>
      <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6">
        <p className="text-xs text-zinc-600 mb-5">AI-generated based on your performance</p>
        <div className="space-y-3">
          {ITEMS.map(({ key, emoji, label }) =>
            gap[key] ? (
              <div key={key} className="flex gap-3 text-sm">
                <span className="shrink-0 text-base">{emoji}</span>
                <div>
                  <span className="text-zinc-500 text-xs uppercase tracking-wide">{label}</span>
                  <p className={`mt-0.5 ${key === "weakestArea" ? "text-zinc-200 font-medium" : "text-zinc-300"}`}>
                    {gap[key]}
                  </p>
                </div>
              </div>
            ) : null
          )}
        </div>
        <div className="flex gap-3 mt-6 pt-4 border-t border-white/8">
          <Link
            href="/labs"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:text-white hover:border-white/30 transition"
          >
            Browse Labs →
          </Link>
          <Link
            href="/paths"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:text-white hover:border-white/30 transition"
          >
            View Paths →
          </Link>
        </div>
      </div>
    </section>
  );
}
