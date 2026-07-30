"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Icon } from "@/components/ui/icon";
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
    <div className="rounded-xl border border-edge divide-y divide-edge-subtle">
      {allLabs.map((lab) => {
        const assigned = assignedIds.includes(lab.id);
        const loading = pending === lab.id;
        const existingDue = dueDates?.[lab.id];
        return (
          <div key={lab.id} className="flex items-center justify-between px-4 py-3 gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">{lab.title}</p>
              <p className="text-xs text-ink-3 font-mono">{lab.slug} · {lab.difficulty}</p>
              {assigned && existingDue && (
                <p className="text-xs text-ink-3 mt-0.5">
                  Due: <span className={new Date(existingDue) < new Date() ? "text-danger" : "text-ink-2"}>
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
                  className="rounded-lg bg-surface-1 border border-edge px-2 py-1 text-xs text-white focus:outline-none focus:border-ok-edge"
                  title="Optional due date"
                />
              )}
              <button
                onClick={() => toggle(lab.id, assigned)}
                disabled={loading}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition disabled:opacity-40 ${
                  assigned
                    ? "bg-ok-wash text-ok hover:bg-danger-wash hover:text-danger border border-ok-edge hover:border-danger-edge"
                    : "bg-surface-2 text-ink-2 hover:bg-ok-wash hover:text-ok border border-edge hover:border-ok-edge"
                }`}
              >
                {loading ? "…" : assigned ? <><Icon name="check" size={12} /> Assigned</> : "Assign"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
