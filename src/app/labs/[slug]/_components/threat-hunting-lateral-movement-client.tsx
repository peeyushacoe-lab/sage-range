"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const AUTH_LOG = `Authentication log — svc_backupagent:
14:02:01  host: FILESRV01   result: Success
14:02:44  host: DB-PROD03   result: Success
14:03:10  host: HR-APP02    result: Success
14:03:35  host: FINANCE-WEB result: Success
14:03:58  host: DC01        result: Success

Baseline: svc_backupagent normally only ever authenticates to FILESRV01.`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function ThreatHuntingLateralMovementClient({
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
    if (checkFlag(t1Answer, "SAGE{1_4cc0unt_5_h0sts_2_m1n}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Count the hosts and the time window in the authentication log.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "Check whether this account's baseline behavior ever touches these hosts, and look for accompanying process execution (e.g. remote exec tools) on each") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Think about what else you'd want to see alongside the raw authentication events.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Disable/reset the compromised account's credentials and isolate the affected hosts to stop further spread") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Think about stopping both the account's further use and the spread across hosts.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Spot the Hunting Signal" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">An authentication log pulled during a proactive hunt:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{AUTH_LOG}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What's the strongest hunting signal here?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — one account authenticating to five different hosts inside two minutes is a strong lateral movement signal. Flag: SAGE&#123;1_4cc0unt_5_h0sts_2_m1n&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Confirm the Finding" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-4">A skeptical teammate suggests this could just be a scheduled automation job.</p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What additional evidence would confirm this is lateral movement and not normal automation?</p>
            <div className="flex flex-col gap-2">
              {[
                "Check whether this account's baseline behavior ever touches these hosts, and look for accompanying process execution (e.g. remote exec tools) on each",
                "Nothing else is needed — the authentication log alone is definitive proof",
                "Only check whether the account's password was recently changed",
                "Assume it's automation unless the account owner explicitly denies it",
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
          <p className="text-sm font-mono text-sage-400">Correct — baseline comparison plus corroborating process activity confirms this isn't normal automation. Flag: SAGE&#123;b4s3l1n3_4nd_pr0c3ss_c0nf1rm&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Contain the Spread" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">Lateral movement is confirmed across five hosts, including the domain controller.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's the priority containment action once lateral movement is confirmed?</p>
            <div className="flex flex-col gap-2">
              {[
                "Disable/reset the compromised account's credentials and isolate the affected hosts to stop further spread",
                "Only monitor the account more closely without taking action",
                "Wait until business hours to avoid disrupting operations",
                "Reset every account in the domain except the compromised one",
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
            Correct — disable/reset the account and isolate affected hosts to stop the lateral movement from spreading further.
            Flag: SAGE&#123;d1s4bl3_4cc0unt_1s0l4t3_h0sts&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;1_4cc0unt_5_h0sts_2_m1n&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;b4s3l1n3_4nd_pr0c3ss_c0nf1rm&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;d1s4bl3_4cc0unt_1s0l4t3_h0sts&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
