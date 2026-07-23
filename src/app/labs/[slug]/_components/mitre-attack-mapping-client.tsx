"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const TACTICS = [
  { id: "TA0001", name: "Initial Access" },
  { id: "TA0002", name: "Execution" },
  { id: "TA0003", name: "Persistence" },
  { id: "TA0004", name: "Privilege Escalation" },
  { id: "TA0005", name: "Defense Evasion" },
  { id: "TA0006", name: "Credential Access" },
  { id: "TA0008", name: "Lateral Movement" },
  { id: "TA0010", name: "Exfiltration" },
];

const INCIDENT_NARRATIVE = `[09:12] An employee opens an emailed invoice attachment; a macro silently executes.
[09:14] The macro launches PowerShell, which downloads and runs a second-stage payload.
[09:20] The malware adds a scheduled task named "SystemUpdater" to run at every logon.
[09:35] The malware dumps credentials from LSASS memory using a known tool.
[09:52] Using the harvested domain admin credentials, the attacker connects to a file server via SMB.
[10:15] Collected files are compressed and uploaded to an external cloud storage bucket.`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function MitreAttackMappingClient({
  labId,
  completedStages: initial,
}: {
  labId: string;
  completedStages: string[];
}) {
  const [completed, setCompleted] = useState<string[]>(initial);
  const [t1Choice, setT1Choice] = useState("");
  const [t1Error, setT1Error] = useState("");
  const [t2Choice, setT2Choice] = useState("");
  const [t2Error, setT2Error] = useState("");
  const [t3Answer, setT3Answer] = useState("");
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
    if (t1Choice === "Initial Access") {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. This is the very first step — how the attacker got a foothold in the environment.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "T1003.001 — LSASS Memory") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. LSASS memory is the specific technique used to dump Windows credentials.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (checkFlag(t3Answer, "SAGE{scheduled_task_persistence_t1053}")) {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Name the technique used to survive a reboot, including its technique ID (T1053).");
    }
  }

  return (
    <div className="space-y-6">
      {/* Reference panel */}
      <div className="rounded-lg border border-white/8 bg-zinc-900/40 p-4">
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Incident Narrative</p>
        <pre className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">{INCIDENT_NARRATIVE}</pre>
      </div>
      <div className="rounded-lg border border-white/8 bg-zinc-900/40 p-4">
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">MITRE ATT&amp;CK Tactics Reference</p>
        <div className="flex flex-wrap gap-2">
          {TACTICS.map((t) => (
            <span key={t.id} className="text-[11px] font-mono text-zinc-400 border border-white/8 rounded px-2 py-1">
              {t.id} — {t.name}
            </span>
          ))}
        </div>
      </div>

      {/* Task 1 */}
      <TaskShell number={1} title="Map the Opening Move" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-4">
          At <span className="text-amber-300 font-mono">09:12</span>, the employee opened a malicious email attachment
          that ran a macro. Which tactic does this belong to?
        </p>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-3">
            <div className="flex flex-wrap gap-3">
              {["Execution", "Initial Access", "Persistence", "Exfiltration"].map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="t1" value={opt} checked={t1Choice === opt} onChange={() => setT1Choice(opt)} className="accent-emerald-500" />
                  <span className="text-sm font-mono text-zinc-200">{opt}</span>
                </label>
              ))}
            </div>
            <SubmitBtn label="Submit" />
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — a spearphishing attachment is how the attacker first got in (TA0001). Flag: SAGE&#123;initial_acc3ss_ta0001&#125;</p>
        )}
      </TaskShell>

      {/* Task 2 */}
      <TaskShell number={2} title="Identify the Credential Access Technique" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-4">
          At <span className="text-amber-300 font-mono">09:35</span>, the malware dumped credentials from a specific
          Windows process. Which MITRE technique does this match?
        </p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <div className="flex flex-col gap-2">
              {["T1110 — Brute Force", "T1003.001 — LSASS Memory", "T1552 — Unsecured Credentials", "T1558 — Kerberoasting"].map((opt) => (
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
          <p className="text-sm font-mono text-sage-400">Correct — dumping credentials from LSASS memory is T1003.001, under the Credential Access tactic (TA0006). Flag: SAGE&#123;lsass_dump_t1003&#125;</p>
        )}
      </TaskShell>

      {/* Task 3 */}
      <TaskShell number={3} title="Map the Persistence Mechanism" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">
          At <span className="text-amber-300 font-mono">09:20</span>, the malware created something to survive
          a reboot. Name the technique and its ID as a flag (format: SAGE&#123;technique_name_t&#8230;&#125;).
        </p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-2">
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t3Answer} onChange={setT3Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t3Error && <p className="text-xs text-red-400 font-mono">{t3Error}</p>}
            <HintPanel labId={labId} stage="task_3" />
          </form>
        )}
        {done("task_3") && (
          <p className="text-sm font-mono text-sage-400">Correct — a scheduled task set to run at logon is T1053 (Scheduled Task/Job), under Persistence (TA0003). Flag: SAGE&#123;scheduled_task_persistence_t1053&#125;</p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <p className="text-xs text-zinc-400 mb-2">Full attack chain, mapped to MITRE ATT&amp;CK:</p>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Initial Access —</span> <span className="text-sage-400">SAGE&#123;initial_acc3ss_ta0001&#125;</span></li>
            <li><span className="text-zinc-500">Credential Access —</span> <span className="text-sage-400">SAGE&#123;lsass_dump_t1003&#125;</span></li>
            <li><span className="text-zinc-500">Persistence —</span> <span className="text-sage-400">SAGE&#123;scheduled_task_persistence_t1053&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
