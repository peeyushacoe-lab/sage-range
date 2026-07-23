"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const NARRATIVE = `Intrusion narrative:
1. Phishing email delivers a macro-laden document (Initial Access)
2. Macro executes a PowerShell downloader (Execution)
3. A scheduled task is created to relaunch the payload on reboot
4. Attacker later dumps LSASS memory to harvest credentials`;

const HEATMAP = `ATT&CK Navigator coverage heatmap for this environment:
Initial Access:     3 detections mapped
Execution:          5 detections mapped
Persistence:        2 detections mapped
Credential Access:   0 detections mapped   <-- gap
Lateral Movement:   4 detections mapped`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function MitreNavigatorClient({
  labId,
  completedStages: initial,
}: {
  labId: string;
  completedStages: string[];
}) {
  const [completed, setCompleted] = useState<string[]>(initial);
  const [t1Answer, setT1Answer] = useState("");
  const [t1Error, setT1Error] = useState("");
  const [t2Choice, setT2Choice] = useState("");
  const [t2Error, setT2Error] = useState("");
  const [t3Choice, setT3Choice] = useState("");
  const [t3Error, setT3Error] = useState("");

  const done = (s: string) => completed.includes(s);
  const allDone = done("task_1") && done("task_2") && done("task_3");

  async function saveStage(stage: string) {
    await fetch("/api/labs/response", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labId, stage, response: "correct" }),
    });
    setCompleted((p) => [...p, stage]);
  }

  function submitT1(e: React.FormEvent) {
    e.preventDefault();
    if (checkFlag(t1Answer, "SAGE{p3rs1st3nc3_t4ct1c}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Which ATT&CK tactic is about surviving a reboot or logoff?");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "There's a detection blind spot for Credential Access — that data source or rule set needs to be built out") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. LSASS dumping clearly happened — what does zero mapped detections for that tactic mean?");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "It reveals detection coverage gaps side-by-side against the full range of adversary techniques used") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Think about what a heatmap view gives you that a paragraph of narrative doesn't.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Map the Tactic" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">An intrusion narrative to map onto ATT&CK:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{NARRATIVE}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What ATT&CK tactic does "scheduled task persistence" fall under?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — scheduled tasks that survive reboot fall under the Persistence tactic. Flag: SAGE&#123;p3rs1st3nc3_t4ct1c&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Spot the Coverage Gap" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">Your organization's Navigator coverage heatmap for this incident:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-red-300 whitespace-pre-wrap overflow-x-auto">{HEATMAP}</pre>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Despite LSASS dumping happening, Credential Access shows zero mapped detections. What does this heatmap gap tell you?</p>
            <div className="flex flex-col gap-2">
              {[
                "There's a detection blind spot for Credential Access — that data source or rule set needs to be built out",
                "Credential Access is a low-priority tactic that doesn't need detection",
                "The zero simply means no attacker has ever tried this technique",
                "This is expected and doesn't need any follow-up",
              ].map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="t2" value={opt} checked={t2Choice === opt} onChange={() => setT2Choice(opt)} className="accent-emerald-500" />
                  <span className="text-sm font-mono text-zinc-200">{opt}</span>
                </label>
              ))}
            </div>
            <SubmitBtn label="Submit" />
            {t2Error && <p className="text-xs text-red-400 font-mono">{t2Error}</p>}
            <HintPanel labId={labId} stage="task_2" />
          </form>
        )}
        {done("task_2") && (
          <p className="text-sm font-mono text-sage-400">Correct — zero coverage for a tactic that clearly occurred is a real detection blind spot needing new rules. Flag: SAGE&#123;bl1nd_sp0t_cr3d3nt14l_4cc3ss&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Explain the Tool's Value" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">A stakeholder asks why you bothered building the Navigator heatmap instead of just writing up the narrative.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's the main value of visualizing an intrusion in ATT&CK Navigator versus just reading a narrative?</p>
            <div className="flex flex-col gap-2">
              {[
                "It reveals detection coverage gaps side-by-side against the full range of adversary techniques used",
                "It's purely a presentation aid with no analytical value",
                "It replaces the need for any actual log analysis",
                "It's only useful for red team exercises, not blue team defense",
              ].map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="t3" value={opt} checked={t3Choice === opt} onChange={() => setT3Choice(opt)} className="accent-emerald-500" />
                  <span className="text-sm font-mono text-zinc-200">{opt}</span>
                </label>
              ))}
            </div>
            <SubmitBtn label="Submit" />
            {t3Error && <p className="text-xs text-red-400 font-mono">{t3Error}</p>}
            <HintPanel labId={labId} stage="task_3" />
          </form>
        )}
        {done("task_3") && (
          <p className="text-sm font-mono text-sage-400">
            Correct — the heatmap visualizes coverage gaps against the full ATT&CK matrix, which a narrative alone can't do.
            Flag: SAGE&#123;v1su4l1z3_c0v3r4g3_g4ps&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;p3rs1st3nc3_t4ct1c&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;bl1nd_sp0t_cr3d3nt14l_4cc3ss&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;v1su4l1z3_c0v3r4g3_g4ps&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
