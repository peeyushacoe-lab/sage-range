"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const LIVE_ALERT = `LIVE ALERT: GetObject calls on s3://acme-customer-data/
Volume: 40,000 objects downloaded in the last 10 minutes (baseline: ~50/day)
Credentials used: IAM access key belonging to a decommissioned CI/CD pipeline`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function CloudIncidentResponseClient({
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
    if (checkFlag(t1Answer, "SAGE{r3v0k3_cr3d3nt14ls_1mm3d14t3ly}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Data is leaving right now — what stops the flow fastest without wiping evidence?");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "That would destroy volatile evidence and logs needed to understand scope and root cause") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Think about what you'd lose forever by tearing everything down immediately.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Reviewing CloudTrail/audit logs for every action the compromised credentials performed across all services, not just the one bucket") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. The credentials were valid — think about everywhere they could have been used, not just where you noticed first.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Stop the Bleeding" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">An active exfiltration alert fires right now:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-red-300 whitespace-pre-wrap overflow-x-auto">{LIVE_ALERT}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What's the very first containment action that stops the bleeding without destroying evidence?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — revoking the compromised credentials immediately stops the exfiltration in progress. Flag: SAGE&#123;r3v0k3_cr3d3nt14ls_1mm3d14t3ly&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Resist the Urge to Tear Down" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-4">A teammate suggests immediately deleting the compromised bucket and terminating any related instances.</p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Why not just delete/terminate the compromised resources right away?</p>
            <div className="flex flex-col gap-2">
              {[
                "That would destroy volatile evidence and logs needed to understand scope and root cause",
                "It's actually the correct first step and should happen before revoking credentials",
                "There's no downside — cloud resources can always be perfectly recreated later",
                "Deleting resources automatically notifies law enforcement",
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
          <p className="text-sm font-mono text-sage-400">Correct — tearing down resources destroys the volatile evidence needed to scope the incident and find root cause. Flag: SAGE&#123;pr3s3rv3_3v1d3nc3_b3f0r3_t34rd0wn&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Determine the True Scope" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">Credentials are revoked and evidence is preserved.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">After containment, what determines the true scope of the breach in a cloud environment?</p>
            <div className="flex flex-col gap-2">
              {[
                "Reviewing CloudTrail/audit logs for every action the compromised credentials performed across all services, not just the one bucket",
                "Only checking the S3 bucket where the alert originally fired",
                "Assuming the scope is limited to whatever the alert mentioned",
                "Asking the CI/CD team if they noticed anything unusual",
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
            Correct — the credentials were valid everywhere, so you must audit every action they took across all services.
            Flag: SAGE&#123;4ud1t_4ll_4ct10ns_n0t_just_0n3_s3rv1c3&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;r3v0k3_cr3d3nt14ls_1mm3d14t3ly&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;pr3s3rv3_3v1d3nc3_b3f0r3_t34rd0wn&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;4ud1t_4ll_4ct10ns_n0t_just_0n3_s3rv1c3&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
