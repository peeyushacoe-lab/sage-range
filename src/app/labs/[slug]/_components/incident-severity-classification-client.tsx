"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const ALERTS = `Alert 1: Single failed login on a low-privilege marketing account, no follow-up activity
Alert 2: Domain admin account logged in from a new country at 3 AM, followed by AD replication changes
Alert 3: Antivirus quarantined a known adware sample on a kiosk PC, no further activity`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function IncidentSeverityClassificationClient({
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
    if (checkFlag(t1Answer, "SAGE{4l3rt_2_d0m41n_4dm1n_cr1t1c4l}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Weigh privilege, anomaly, and impact for each alert.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "Privileged account, plus anomalous access pattern, plus high-impact action together push it to critical") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. No single factor alone makes it critical — think about the combination.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Both are low severity — routine monitoring is sufficient, and they shouldn't compete with the critical alert for response time") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Neither of the other two alerts shows privilege escalation or high-impact follow-on activity.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Triage the Alerts" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">Three alerts fire simultaneously in your SOC queue:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{ALERTS}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Which alert is CRITICAL severity and needs immediate escalation?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — Alert 2's domain admin logon from a new country, followed by AD replication changes, is critical. Flag: SAGE&#123;4l3rt_2_d0m41n_4dm1n_cr1t1c4l&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Justify the Severity" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-4">A newer analyst asks why Alert 2 outranks the other two so clearly.</p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What combination of factors makes Alert 2 critical rather than just "suspicious"?</p>
            <div className="flex flex-col gap-2">
              {[
                "Privileged account, plus anomalous access pattern, plus high-impact action together push it to critical",
                "It's critical purely because it happened at 3 AM",
                "Any AD-related alert is automatically critical, regardless of context",
                "It's critical simply because it's the third alert of the day",
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
          <p className="text-sm font-mono text-sage-400">Correct — it's the combination of privilege, anomaly, and impact together, not any single factor alone. Flag: SAGE&#123;pr1v_4cc3ss_4n0m4ly_1mp4ct&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Classify the Rest" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">You still need to formally close out Alerts 1 and 3.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">How should Alerts 1 and 3 be classified relative to Alert 2?</p>
            <div className="flex flex-col gap-2">
              {[
                "Both are low severity — routine monitoring is sufficient, and they shouldn't compete with the critical alert for response time",
                "Both should be escalated to the same critical severity as Alert 2",
                "Alert 3 is critical because antivirus caught malware",
                "Alert 1 is critical because any failed login could be an attack",
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
            Correct — both are low severity; routine monitoring covers them without pulling response resources away from the actual critical incident.
            Flag: SAGE&#123;l0w_s3v_r0ut1n3_m0n1t0r1ng&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;4l3rt_2_d0m41n_4dm1n_cr1t1c4l&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;pr1v_4cc3ss_4n0m4ly_1mp4ct&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;l0w_s3v_r0ut1n3_m0n1t0r1ng&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
