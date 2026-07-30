"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Icon } from "@/components/ui/icon";
type ScenarioOption = {
  id: string; title: string; subtitle: string;
  difficulty: string; estimatedMinutes: number; personaId: string;
};

type AssignedSim = { scenarioId: string; title: string; dueDate: string | null };

const PERSONA_COLOR: Record<string, string> = {
  ransomware_gang:  "text-danger border-danger-edge",
  nation_state_apt: "text-accent border-accent-edge",
  insider:          "text-warn border-warn-edge",
  hacktivist:       "text-cyan-400 border-cyan-500/40",
  cybercriminal:    "text-sev-high border-sev-high-edge",
};

const DIFF_COLOR: Record<string, string> = {
  EASY: "text-ok", MEDIUM: "text-warn",
  HARD: "text-sev-high", INSANE: "text-danger",
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
        const pc = PERSONA_COLOR[s.personaId] ?? "text-ink-2 border-edge-strong";
        return (
          <div key={s.id} className={`rounded-xl border p-4 flex items-center justify-between gap-4 transition ${on ? "border-info-edge bg-info-wash" : "border-edge bg-surface-1"}`}>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-[10px] font-bold uppercase border rounded px-1.5 py-0.5 ${pc}`}>
                  {s.personaId.replace("_", " ").toUpperCase()}
                </span>
                <span className={`text-[10px] font-bold ${DIFF_COLOR[s.difficulty]}`}>{s.difficulty}</span>
                <span className="text-[10px] text-ink-3">{s.estimatedMinutes} min</span>
              </div>
              <p className="font-semibold text-sm text-ink">{s.title}</p>
              <p className="text-xs text-ink-3 truncate">{s.subtitle}</p>
            </div>
            <button
              onClick={() => toggle(s)}
              disabled={loading}
              className={`shrink-0 text-xs font-bold uppercase tracking-wide rounded-lg px-3 py-1.5 transition disabled:opacity-40 ${
                on ? "bg-info-wash text-info hover:bg-danger-wash hover:text-danger" : "bg-surface-2 text-ink-2 hover:bg-info-wash hover:text-info"
              }`}
            >
              {loading ? "…" : on ? <><Icon name="check" size={12} /> Assigned</> : "Assign"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
