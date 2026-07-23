import Link from "next/link";
import { ACHIEVEMENT_CATEGORIES, type Achievement } from "@/lib/insights/achievements";

export function AchievementsGrid({ achievements }: { achievements: Achievement[] }) {
  return (
    <>
      {ACHIEVEMENT_CATEGORIES.map(({ key, label }) => {
        const group = achievements.filter((a) => a.category === key);
        const groupEarned = group.filter((a) => a.earnedAt !== null).length;
        return (
          <section key={key}>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-sm font-semibold text-zinc-300">{label}</h2>
              <span className="text-xs text-zinc-600">{groupEarned}/{group.length}</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {group.map((ach) => {
                const unlocked = ach.earnedAt !== null;
                return (
                  <div
                    key={ach.id}
                    className={`rounded-xl border p-4 flex flex-col gap-2 transition-all ${
                      unlocked
                        ? "border-white/12 bg-zinc-900/70"
                        : "border-zinc-800/50 bg-zinc-900/20 opacity-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-2xl leading-none ${unlocked ? "" : "grayscale"}`}>
                        {ach.emoji}
                      </span>
                      {unlocked && (
                        <span className="text-[10px] font-bold text-emerald-400 border border-emerald-500/30 bg-emerald-500/8 rounded px-1.5 py-0.5 shrink-0">
                          EARNED
                        </span>
                      )}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold leading-tight ${unlocked ? "text-zinc-100" : "text-zinc-600"}`}>
                        {ach.name}
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">
                        {ach.description}
                      </p>
                    </div>
                    {unlocked && ach.earnedAt && (
                      <div className="flex items-center justify-between mt-auto pt-1">
                        <p className="text-[10px] text-zinc-600">
                          {ach.earnedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                        <Link
                          href={`/achievements/${ach.id}`}
                          className="text-[10px] text-zinc-600 hover:text-emerald-400 transition-colors"
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
