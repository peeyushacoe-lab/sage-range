"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Lab = { id: string; slug: string; title: string; difficulty: string };

export function AssignLabsClient({
  classroomId,
  allLabs,
  assignedIds,
  dueDates,
}: {
  classroomId: string;
  allLabs: Lab[];
  assignedIds: string[];
  dueDates?: Record<string, string | null>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  // Track per-lab due date inputs (only shown for unassigned labs before assigning)
  const [dueDateInputs, setDueDateInputs] = useState<Record<string, string>>({});

  async function toggle(labId: string, isAssigned: boolean) {
    setPending(labId);
    const dueDate = !isAssigned ? (dueDateInputs[labId] ?? "") : undefined;
    await fetch(`/api/classroom/${classroomId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        labId,
        action: isAssigned ? "remove" : "assign",
        ...(dueDate ? { dueDate: new Date(dueDate).toISOString() } : {}),
      }),
    });
    router.refresh();
    setPending(null);
  }

  return (
    <div className="rounded-xl border border-white/8 divide-y divide-white/8">
      {allLabs.map((lab) => {
        const assigned = assignedIds.includes(lab.id);
        const loading = pending === lab.id;
        const existingDue = dueDates?.[lab.id];
        return (
          <div key={lab.id} className="flex items-center justify-between px-4 py-3 gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">{lab.title}</p>
              <p className="text-xs text-zinc-500 font-mono">{lab.slug} · {lab.difficulty}</p>
              {assigned && existingDue && (
                <p className="text-xs text-zinc-500 mt-0.5">
                  Due: <span className={new Date(existingDue) < new Date() ? "text-red-400" : "text-zinc-400"}>
                    {new Date(existingDue) < new Date()
                      ? "Past due"
                      : new Date(existingDue).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!assigned && (
                <input
                  type="date"
                  value={dueDateInputs[lab.id] ?? ""}
                  onChange={(e) => setDueDateInputs((prev) => ({ ...prev, [lab.id]: e.target.value }))}
                  className="rounded-lg bg-zinc-900 border border-white/10 px-2 py-1 text-xs text-white focus:outline-none focus:border-sage-500/60"
                  title="Optional due date"
                />
              )}
              <button
                onClick={() => toggle(lab.id, assigned)}
                disabled={loading}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition disabled:opacity-40 ${
                  assigned
                    ? "bg-sage-500/10 text-sage-400 hover:bg-red-500/10 hover:text-red-400 border border-sage-500/30 hover:border-red-500/30"
                    : "bg-zinc-800 text-zinc-400 hover:bg-sage-500/10 hover:text-sage-400 border border-white/8 hover:border-sage-500/30"
                }`}
              >
                {loading ? "…" : assigned ? "Assigned ✓" : "Assign"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
