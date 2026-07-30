import Link from "next/link";
import { ACHIEVEMENT_CATEGORIES, type Achievement } from "@/lib/insights/achievements";

import { Icon } from "@/components/ui/icon";
export function AchievementsGrid({ achievements }: { achievements: Achievement[] }) {
  return (
    <>
      {ACHIEVEMENT_CATEGORIES.map(({ key, label }) => {
        const group = achievements.filter((a) => a.category === key);
        const groupEarned = group.filter((a) => a.earnedAt !== null).length;
        return (
          <section key={key}>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-sm font-semibold text-ink-2">{label}</h2>
              <span className="text-xs text-ink-3">{groupEarned}/{group.length}</span>
              <div className="flex-1 h-px bg-surface-2" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {group.map((ach) => {
                const unlocked = ach.earnedAt !== null;
                return (
                  <div
                    key={ach.id}
                    className={`rounded-xl border p-4 flex flex-col gap-2 transition-all ${
                      unlocked
                        ? "border-edge-strong bg-surface-1"
                        : "border-edge-strong/50 bg-surface-1 opacity-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-2xl leading-none ${unlocked ? "" : "grayscale"}`}>
                        <Icon name={ach.icon} size={24} />
                      </span>
                      {unlocked && (
                        <span className="text-[10px] font-bold text-ok border border-ok-edge bg-ok-wash rounded px-1.5 py-0.5 shrink-0">
                          EARNED
                        </span>
                      )}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold leading-tight ${unlocked ? "text-ink" : "text-ink-3"}`}>
                        {ach.name}
                      </p>
                      <p className="text-[11px] text-ink-3 mt-0.5 leading-snug">
                        {ach.description}
                      </p>
                    </div>
                    {unlocked && ach.earnedAt && (
                      <div className="flex items-center justify-between mt-auto pt-1">
                        <p className="text-[10px] text-ink-3">
                          {ach.earnedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                        <Link
                          href={`/achievements/${ach.id}`}
                          className="text-[10px] text-ink-3 hover:text-ok transition-colors"
                          title="Share this achievement"
                        >
                          Share ↗
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}
