"use client";

import type { StudentRow } from "./recruiter-tabs";

export type AssessmentRating = "EXCEPTIONAL" | "STRONG" | "ADEQUATE" | "DEVELOPING";

const RATING_STYLES: Record<AssessmentRating, { badge: string; row: string }> = {
  EXCEPTIONAL: { badge: "border-ok-edge bg-ok-wash text-ok",   row: "bg-ok-wash" },
  STRONG:      { badge: "border-info-edge bg-info-wash text-info",   row: "bg-info-wash" },
  ADEQUATE:    { badge: "border-warn-edge bg-warn-wash text-warn", row: "" },
  DEVELOPING:  { badge: "border-edge-strong bg-surface-2 text-ink-2",         row: "" },
};

function toRating(score: number): AssessmentRating {
  if (score >= 88) return "EXCEPTIONAL";
  if (score >= 68) return "STRONG";
  if (score >= 48) return "ADEQUATE";
  return "DEVELOPING";
}

export function AssessmentTab({ students }: { students: StudentRow[] }) {
  const assessed = students
    .filter((s) => s.bestSimScore > 0)
    .sort((a, b) => b.bestSimScore - a.bestSimScore);

  const unassessed = students.filter((s) => s.bestSimScore === 0);

  const countByRating = assessed.reduce<Record<AssessmentRating, number>>(
    (acc, s) => { acc[toRating(s.bestSimScore)]++; return acc; },
    { EXCEPTIONAL: 0, STRONG: 0, ADEQUATE: 0, DEVELOPING: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["EXCEPTIONAL", "STRONG", "ADEQUATE", "DEVELOPING"] as AssessmentRating[]).map((r) => (
          <div key={r} className={`rounded-xl border p-4 ${RATING_STYLES[r].badge}`}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-70">{r}</p>
            <p className="text-2xl font-bold">{countByRating[r]}</p>
            <p className="text-[10px] opacity-60 mt-0.5">candidates</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-ink-3">
        Ratings derived from simulation performance scores across {assessed.length} assessed candidates.
        {unassessed.length > 0 && ` ${unassessed.length} have not completed a simulation yet.`}
      </p>

      {/* Assessed candidates */}
      {assessed.length === 0 ? (
        <div className="rounded-xl border border-edge p-10 text-center text-sm text-ink-3">
          No candidates have completed a simulation yet.
        </div>
      ) : (
        <div className="rounded-xl border border-edge overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge text-ink-3 text-xs uppercase tracking-wider">
                <th className="text-left p-4">Candidate</th>
                <th className="text-center p-4">Assessment</th>
                <th className="text-right p-4">Best Score</th>
                <th className="text-right p-4">Runs</th>
                <th className="text-right p-4">Skill Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge-subtle">
              {assessed.map((s) => {
                const rating = toRating(s.bestSimScore);
                const style = RATING_STYLES[rating];
                return (
                  <tr key={s.id} className={`transition-colors hover:bg-surface-2 ${style.row}`}>
                    <td className="p-4">
                      <p className="font-medium text-ink">{s.displayName ?? s.email.split("@")[0]}</p>
                      <p className="text-xs text-ink-3">{s.email}</p>
                      {s.university && <p className="text-xs text-ink-3">{s.university}</p>}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`text-[10px] font-bold uppercase tracking-widest border rounded px-2 py-0.5 ${style.badge}`}>
                        {rating}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-ok">{s.bestSimScore}</td>
                    <td className="p-4 text-right text-ink-2">{s.simCount}</td>
                    <td className="p-4 text-right text-ink-2">{s.skillScore}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Unassessed candidates */}
      {unassessed.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-ink-3 mb-3">Not Yet Assessed ({unassessed.length})</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {unassessed.map((s) => (
              <div key={s.id} className="rounded-lg border border-edge-subtle p-3 text-xs text-ink-3">
                <p className="font-medium text-ink-2">{s.displayName ?? s.email.split("@")[0]}</p>
                <p className="text-ink-3">{s.email}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
