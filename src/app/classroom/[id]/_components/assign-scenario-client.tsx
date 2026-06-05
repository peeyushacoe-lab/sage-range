"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type ScenarioOption = {
  id: string; title: string; subtitle: string;
  difficulty: string; estimatedMinutes: number; personaId: string;
};

type AssignedSim = { scenarioId: string; title: string; dueDate: string | null };

const PERSONA_COLOR: Record<string, string> = {
  ransomware_gang:  "text-red-400 border-red-500/40",
  nation_state_apt: "text-purple-400 border-purple-500/40",
  insider:          "text-amber-400 border-amber-500/40",
  hacktivist:       "text-cyan-400 border-cyan-500/40",
  cybercriminal:    "text-orange-400 border-orange-500/40",
};

const DIFF_COLOR: Record<string, string> = {
  EASY: "text-sage-400", MEDIUM: "text-amber-400",
  HARD: "text-orange-400", INSANE: "text-red-400",
};

export function AssignScenarioClient({
  classroomId,
  scenarios,
  initialAssigned,
}: {
  classroomId: string;
  scenarios: ScenarioOption[];
  initialAssigned: AssignedSim[];
}) {
  const [assigned, setAssigned] = useState(initialAssigned);
  const [pending, setPending] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const assignedIds = new Set(assigned.map((a) => a.scenarioId));

  async function toggle(scenario: ScenarioOption) {
    if (pending) return;
    setPending(scenario.id);
    if (assignedIds.has(scenario.id)) {
      await fetch(`/api/classroom/${classroomId}/assign-scenario?scenarioId=${scenario.id}`, { method: "DELETE" });
      setAssigned((p) => p.filter((a) => a.scenarioId !== scenario.id));
    } else {
      const res = await fetch(`/api/classroom/${classroomId}/assign-scenario`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: scenario.id }),
      });
      if (res.ok) {
        const data = await res.json() as AssignedSim;
        setAssigned((p) => [...p, { scenarioId: data.scenarioId, title: scenario.title, dueDate: null }]);
      }
    }
    setPending(null);
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-3">
      {scenarios.map((s) => {
        const on = assignedIds.has(s.id);
        const loading = pending === s.id;
        const pc = PERSONA_COLOR[s.personaId] ?? "text-zinc-400 border-zinc-600";
        return (
          <div key={s.id} className={`rounded-xl border p-4 flex items-center justify-between gap-4 transition ${on ? "border-blue-500/30 bg-blue-500/5" : "border-white/8 bg-zinc-900/30"}`}>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-[10px] font-bold uppercase border rounded px-1.5 py-0.5 ${pc}`}>
                  {s.personaId.replace("_", " ").toUpperCase()}
                </span>
                <span className={`text-[10px] font-bold ${DIFF_COLOR[s.difficulty]}`}>{s.difficulty}</span>
                <span className="text-[10px] text-zinc-600">{s.estimatedMinutes} min</span>
              </div>
              <p className="font-semibold text-sm text-zinc-100">{s.title}</p>
              <p className="text-xs text-zinc-500 truncate">{s.subtitle}</p>
            </div>
            <button
              onClick={() => toggle(s)}
              disabled={loading}
              className={`shrink-0 text-xs font-bold uppercase tracking-wide rounded-lg px-3 py-1.5 transition disabled:opacity-40 ${
                on ? "bg-blue-500/15 text-blue-400 hover:bg-red-500/15 hover:text-red-400" : "bg-zinc-800 text-zinc-400 hover:bg-blue-500/15 hover:text-blue-400"
              }`}
            >
              {loading ? "…" : on ? "Assigned ✓" : "Assign"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
