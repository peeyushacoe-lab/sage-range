"use client";

import { useState } from "react";
import { TaskShell, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const SIGMA_RULE = `title: Suspicious rundll32 Execution
logsource:
  category: process_creation
detection:
  selection:
    Image|endswith: '\\rundll32.exe'
    CommandLine|contains: 'javascript:'
  condition: selection`;

const KQL_DRAFT = `DeviceProcessEvents
| where ProcessCommandLine contains "rundll32"`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function SigmaToSentinelClient({
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
    if (t1Choice === "DeviceProcessEvents (or SecurityEvent) — process creation events") {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Match the Sigma logsource category to its Sentinel/Defender equivalent.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "It matches on the binary name alone, so it will fire on essentially all legitimate rundll32 usage — too broad") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Compare the KQL draft's filter condition against the original Sigma rule's condition.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "A condition on the specific suspicious DLL path/argument pattern, not just the process name") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. The fix should mirror what the Sigma rule actually checked for, not just the binary name.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Map the Data Source" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">The Sigma rule you need to port to Sentinel:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{SIGMA_RULE}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Which Sentinel/Log Analytics table does a Sigma process_creation rule map to?</p>
            <div className="flex flex-col gap-2">
              {[
                "DeviceProcessEvents (or SecurityEvent) — process creation events",
                "DeviceNetworkEvents — network connection events",
                "SigninLogs — Azure AD sign-in events",
                "DeviceFileEvents — file creation/modification events",
              ].map((opt) => (
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
          <p className="text-sm font-mono text-sage-400">Correct — process_creation events land in DeviceProcessEvents. Flag: SAGE&#123;d3v1c3pr0c3ss3v3nts_t4bl3&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Review a Rough Translation" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">A teammate's first-pass KQL translation:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{KQL_DRAFT}</pre>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's wrong with this direct translation, compared to the original Sigma rule?</p>
            <div className="flex flex-col gap-2">
              {[
                "It matches on the binary name alone, so it will fire on essentially all legitimate rundll32 usage — too broad",
                "It's missing a time range filter",
                "DeviceProcessEvents doesn't support the where operator",
                "Nothing — this is functionally identical to the Sigma rule",
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
          <p className="text-sm font-mono text-sage-400">Correct — the Sigma rule required the javascript: argument too; dropping that condition makes the KQL version far too broad. Flag: SAGE&#123;t00_br0ad_kql_transl4t10n&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Fix the Query" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">You need to bring the KQL version back in line with the original Sigma rule's intent.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What should the fixed KQL add to reduce false positives while still catching the technique?</p>
            <div className="flex flex-col gap-2">
              {[
                "A condition on the specific suspicious DLL path/argument pattern, not just the process name",
                "A longer time range so it catches more history",
                "Remove the DeviceProcessEvents table entirely",
                "Nothing needs to change, broader coverage is always better",
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
            Correct — scoping the KQL to the specific suspicious argument pattern restores the original rule's precision.
            Flag: SAGE&#123;4rgum3nt_sc0p3d_d3t3ct10n&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;d3v1c3pr0c3ss3v3nts_t4bl3&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;t00_br0ad_kql_transl4t10n&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;4rgum3nt_sc0p3d_d3t3ct10n&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
