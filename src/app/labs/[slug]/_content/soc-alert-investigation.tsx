import { db } from "@/lib/db";
import { SocInvestigationForm } from "../_components/soc-investigation-form";
import { SocTask2Containment } from "../_components/soc-task2-containment";
import { SocTask3ThreatHunt } from "../_components/soc-task3-threathunt";

export async function SocAlertInvestigation({ labId, userId }: { labId: string; userId: string }) {
  const existing = await db.labResponse.findMany({
    where: { userId, labId },
    select: { stage: true, response: true, id: true },
  });

  const completedStages = new Set(existing.map((r) => r.stage));
  const task1Done = completedStages.has("investigation");
  const task2Done = completedStages.has("task_2");

  return (
    <div className="space-y-10">
      {/* Task 1 — Identification */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${task1Done ? "bg-sage-500/20 text-sage-500" : "bg-amber-500/20 text-amber-400 animate-pulse"}`}>
            TASK 1
          </span>
          <h3 className="font-semibold text-zinc-200">Log Analysis &amp; Identification</h3>
          {task1Done && <span className="text-xs text-sage-500 ml-auto">✓ Complete</span>}
        </div>
        <SocInvestigationForm labId={labId} existing={existing} />
      </section>

      {/* Task 2 — Containment Planning (unlocked after Task 1) */}
      {task1Done && (
        <section className="border-t border-white/8 pt-8">
          <div className="flex items-center gap-3 mb-4">
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${task2Done ? "bg-sage-500/20 text-sage-500" : "bg-amber-500/20 text-amber-400 animate-pulse"}`}>
              TASK 2
            </span>
            <h3 className="font-semibold text-zinc-200">Containment Planning</h3>
            {task2Done && <span className="text-xs text-sage-500 ml-auto">✓ Complete</span>}
          </div>
          <SocTask2Containment labId={labId} alreadyDone={task2Done} />
        </section>
      )}

      {/* Task 3 — Threat Hunting (unlocked after Task 2) */}
      {task2Done && (
        <section className="border-t border-white/8 pt-8">
          <div className="flex items-center gap-3 mb-4">
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${completedStages.has("task_3") ? "bg-sage-500/20 text-sage-500" : "bg-amber-500/20 text-amber-400 animate-pulse"}`}>
              TASK 3
            </span>
            <h3 className="font-semibold text-zinc-200">Threat Hunting — Lateral Movement</h3>
            {completedStages.has("task_3") && <span className="text-xs text-sage-500 ml-auto">✓ Complete</span>}
          </div>
          <SocTask3ThreatHunt labId={labId} alreadyDone={completedStages.has("task_3")} />
        </section>
      )}
    </div>
  );
}
