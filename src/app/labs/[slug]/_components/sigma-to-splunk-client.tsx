"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn, QueryDisplay } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const SIGMA_RULE = `title: Suspicious LSASS Access
logsource:
  category: process_access
  product: windows
detection:
  selection:
    TargetImage|endswith: '\\\\lsass.exe'
    GrantedAccess: '0x1010'
  condition: selection
level: critical`;

const SPL_OPTIONS = [
  "index=windows source=\"WinEventLog:Microsoft-Windows-Sysmon/Operational\" EventCode=10 TargetImage=\"*\\\\lsass.exe\" GrantedAccess=\"0x1010\"",
  "index=windows sourcetype=access_combined status=200 uri=\"lsass\"",
  "index=windows EventCode=4624 LogonType=3",
  "index=* | stats count by src_ip",
];

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function SigmaToSplunkClient({
  labId,
  completedStages: initial,
}: {
  labId: string;
  completedStages: string[];
}) {
  const [completed, setCompleted] = useState<string[]>(initial);
  const [t1Choice, setT1Choice] = useState("");
  const [t1Error, setT1Error] = useState("");
  const [t2Answer, setT2Answer] = useState("");
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
    if (t1Choice === SPL_OPTIONS[0]) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Match every field in the Sigma detection block (TargetImage, GrantedAccess) to the SPL query.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (checkFlag(t2Answer, "SAGE{sysm0n_3v3nt_10_pr0c3ss_4cc3ss}")) {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Which Sysmon Event ID logs process-access events (like one process opening a handle to another)? Format as a flag.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Field names and log sources differ between SIEMs — a rule is only as good as the mapping to the actual schema") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Think about why the exact same Sigma rule needed different field names for the SPL query.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Task 1 */}
      <TaskShell number={1} title="Translate the Rule" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">
          You have a vendor-provided Sigma rule and need to run it as a search in Splunk.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{SIGMA_RULE}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Which SPL query correctly implements this Sigma rule?</p>
            <div className="space-y-2">
              {SPL_OPTIONS.map((opt) => (
                <label key={opt} className="flex items-start gap-2 cursor-pointer">
                  <input type="radio" name="t1" value={opt} checked={t1Choice === opt} onChange={() => setT1Choice(opt)} className="accent-emerald-500 mt-1" />
                  <QueryDisplay query={opt} />
                </label>
              ))}
            </div>
            <SubmitBtn label="Submit" />
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — the SPL query maps TargetImage and GrantedAccess exactly, scoped to the Sysmon index and Event ID 10. Flag: SAGE&#123;spl_qu3ry_m4pp3d&#125;</p>
        )}
      </TaskShell>

      {/* Task 2 */}
      <TaskShell number={2} title="Identify the Underlying Event" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">
          The logsource category is <code className="text-amber-300">process_access</code> — this maps to a specific
          Sysmon Event ID that must be present in your log pipeline for the rule to ever fire.
        </p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Flag the Sysmon event ID and its name for process-access logging.</p>
            <div className="flex gap-2 max-w-lg">
              <MonoInput value={t2Answer} onChange={setT2Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t2Error && <p className="text-xs text-red-400 font-mono">{t2Error}</p>}
            <HintPanel labId={labId} stage="task_2" />
          </form>
        )}
        {done("task_2") && (
          <p className="text-sm font-mono text-sage-400">Correct — Sysmon Event ID 10 (ProcessAccess) logs one process opening a handle to another, which is exactly what LSASS credential-dumping tools trigger. Flag: SAGE&#123;sysm0n_3v3nt_10_pr0c3ss_4cc3ss&#125;</p>
        )}
      </TaskShell>

      {/* Task 3 */}
      <TaskShell number={3} title="Understand Why Conversion Isn't Trivial" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">
          The exact same Sigma rule would need yet another rewrite to run in Microsoft Sentinel (KQL) instead of Splunk.
        </p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Why can't Sigma rules just run everywhere unchanged?</p>
            <div className="flex flex-col gap-2">
              {[
                "Sigma rules are proprietary and require a paid license per SIEM",
                "Field names and log sources differ between SIEMs — a rule is only as good as the mapping to the actual schema",
                "Sigma only supports Windows, never other platforms",
                "There is no real difference between SIEM query languages",
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
            Correct — Sigma is a generic, vendor-neutral format precisely because every SIEM indexes and names fields
            differently; the actual value comes from the field mapping ("backend"), not the rule logic itself. Flag: SAGE&#123;s13m_f13ld_m4pp1ng_v4r13s&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;spl_qu3ry_m4pp3d&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;sysm0n_3v3nt_10_pr0c3ss_4cc3ss&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;s13m_f13ld_m4pp1ng_v4r13s&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
