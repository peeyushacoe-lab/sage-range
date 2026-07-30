import Link from "next/link";

import { Icon, type IconName } from "@/components/ui/icon";
type GapData = {
  weakestArea: string;
  gapSummary: string;
  recommendedLabs: string;
  recommendedPaths: string;
  nextSimulation: string;
};

const ITEMS: { key: keyof GapData; icon: IconName; label: string }[] = [
  { key: "weakestArea", icon: "simulations" as IconName, label: "Weakest Area" },
  { key: "gapSummary", icon: "reports" as IconName, label: "Gap Summary" },
  { key: "recommendedLabs", icon: "labs" as IconName, label: "Recommended Labs" },
  { key: "recommendedPaths", icon: "progress" as IconName, label: "Recommended Paths" },
  { key: "nextSimulation", icon: "energy" as IconName, label: "Next Simulation" },
];

export function GapAnalysis({ gap }: { gap: GapData }) {
  return (
    <section className="mt-12 border-t border-edge pt-10">
      <h2 className="text-sm uppercase tracking-widest text-ink-3 mb-4">Personalized Training Plan</h2>
      <div className="rounded-xl border border-edge bg-surface-1 p-6">
        <p className="text-xs text-ink-3 mb-5">AI-generated based on your performance</p>
        <div className="space-y-3">
          {ITEMS.map(({ key, icon, label }) =>
            gap[key] ? (
              <div key={key} className="flex gap-3 text-sm">
                <Icon name={icon} size={16} className="shrink-0" />
                <div>
                  <span className="text-ink-3 text-xs uppercase tracking-wide">{label}</span>
                  <p className={`mt-0.5 ${key === "weakestArea" ? "text-ink font-medium" : "text-ink-2"}`}>
                    {gap[key]}
                  </p>
                </div>
              </div>
            ) : null
          )}
        </div>
        <div className="flex gap-3 mt-6 pt-4 border-t border-edge">
          <Link
            href="/labs"
            className="rounded-lg border border-edge px-4 py-2 text-sm text-ink-2 hover:text-white hover:border-edge-strong transition"
          >
            Browse Labs →
          </Link>
          <Link
            href="/paths"
            className="rounded-lg border border-edge px-4 py-2 text-sm text-ink-2 hover:text-white hover:border-edge-strong transition"
          >
            View Paths →
          </Link>
        </div>
      </div>
    </section>
  );
}
