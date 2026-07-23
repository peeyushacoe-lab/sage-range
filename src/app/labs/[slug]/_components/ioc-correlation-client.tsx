"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const ALERTS = `Alert A: host 10.0.2.14 beacons to c2-relay-node88.net every 60s
Alert B: host 10.0.4.71 beacons to c2-relay-node88.net every 60s
Alert C: host 10.0.9.30 beacons to c2-relay-node88.net every 60s

Threat feed: c2-relay-node88.net flagged as active C2 for "Operation Slatepine"`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function IocCorrelationClient({
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
    if (checkFlag(t1Answer, "SAGE{s1ngl3_c4mp41gn_sh4r3d_c2}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Look at what all three alerts have in common despite different source hosts.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "Correlate the alerts by shared indicator (C2 domain/subnet) rather than just internal alert grouping — the same infrastructure ties them together") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Different source IPs doesn't mean unrelated activity — look at what they share.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Pivot on the confirmed IOCs (C2 domain, subnet) to search for any other affected hosts across the environment") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. You've confirmed a shared indicator — use it to look for more.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Find the Common Thread" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">Three internal alerts, and a threat feed match:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{ALERTS}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What does the shared C2 domain across all three alerts confirm?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — three different hosts beaconing to the same known C2 confirms one coordinated campaign. Flag: SAGE&#123;s1ngl3_c4mp41gn_sh4r3d_c2&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Correlate the Right Way" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-4">A junior analyst wants to treat these as three unrelated incidents since the source IPs differ.</p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's the flaw in that reasoning, and what's the right approach?</p>
            <div className="flex flex-col gap-2">
              {[
                "Correlate the alerts by shared indicator (C2 domain/subnet) rather than just internal alert grouping — the same infrastructure ties them together",
                "The junior analyst is right — different source IPs always mean unrelated incidents",
                "Only the timestamp matters for correlation, not the destination",
                "Alerts should never be correlated across different hosts",
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
          <p className="text-sm font-mono text-sage-400">Correct — correlating by shared IOC, not source host, reveals the true single campaign. Flag: SAGE&#123;c0rr3l4t3_by_sh4r3d_10c_n0t_src&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Act on the Correlation" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">You've confirmed the three alerts are one campaign.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Once correlated, what's the right next step?</p>
            <div className="flex flex-col gap-2">
              {[
                "Pivot on the confirmed IOCs (C2 domain, subnet) to search for any other affected hosts across the environment",
                "Close all three alerts as duplicates and move on",
                "Only remediate the first host that was alerted on",
                "Wait for the threat feed to update before taking any action",
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
            Correct — pivot on the confirmed IOCs to hunt across the whole environment for any other affected hosts.
            Flag: SAGE&#123;p1v0t_0n_c0nf1rm3d_10cs&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;s1ngl3_c4mp41gn_sh4r3d_c2&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;c0rr3l4t3_by_sh4r3d_10c_n0t_src&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;p1v0t_0n_c0nf1rm3d_10cs&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
