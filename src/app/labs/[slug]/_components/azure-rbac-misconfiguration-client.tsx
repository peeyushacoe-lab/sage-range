"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn, verifyStage, useRevealedFlags } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const ROLE_ASSIGNMENTS = `Role Assignments — Subscription "Prod-EastUS":
  user: alice@acmecorp.com         Role: Contributor   Scope: Resource Group "app-prod"
  user: guest_bob@partnerco.com    Role: Owner         Scope: Subscription (root)
  user: svc-ci-pipeline            Role: Contributor   Scope: Resource Group "app-prod"
  group: SecurityTeam              Role: Reader        Scope: Subscription (root)`;

export function AzureRbacMisconfigurationClient({
  labId,
  completedStages: initial,
}: {
  labId: string;
  completedStages: string[];
}) {
  const [completed, setCompleted] = useState<string[]>(initial);
  const [revealed, addReveal] = useRevealedFlags(labId);
  const [t1Answer, setT1Answer] = useState("");
  const [t1Error, setT1Error] = useState("");
  const [t2Choice, setT2Choice] = useState("");
  const [t2Error, setT2Error] = useState("");
  const [t3Choice, setT3Choice] = useState("");
  const [t3Error, setT3Error] = useState("");

  const done = (s: string) => completed.includes(s);
  const allDone = done("task_1") && done("task_2") && done("task_3");

  function markDone(stage: string, reveal?: string) {
    setCompleted((p) => (p.includes(stage) ? p : [...p, stage]));
    addReveal(stage, reveal);
  }

  async function submitT1(e: React.FormEvent) {
    e.preventDefault();
    const verdict = await verifyStage(labId, "task_1", t1Answer);
    if (verdict.correct) {
      setT1Error("");
      markDone("task_1", verdict.reveal);
    } else {
      setT1Error("Incorrect. Check both the role AND the scope for each assignment.");
    }
  }

  async function submitT2(e: React.FormEvent) {
    e.preventDefault();
    const verdict = await verifyStage(labId, "task_2", t2Choice);
    if (verdict.correct) {
      setT2Error("");
      markDone("task_2", verdict.reveal);
    } else {
      setT2Error("Incorrect. Think about what Owner grants that Contributor specifically doesn't.");
    }
  }

  async function submitT3(e: React.FormEvent) {
    e.preventDefault();
    const verdict = await verifyStage(labId, "task_3", t3Choice);
    if (verdict.correct) {
      setT3Error("");
      markDone("task_3", verdict.reveal);
    } else {
      setT3Error("Incorrect. Least privilege means matching access to the actual need, not just picking a lower built-in role.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Audit the Assignments" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">A quarterly access review pulls all role assignments on the production subscription:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{ROLE_ASSIGNMENTS}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Which assignment is the most dangerous, and to whom?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — an external guest account holds Owner at the subscription root, the widest possible scope. Flag: {revealed.task_1 ?? "SAGE{…}"}</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Understand the Blast Radius" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-4">Owner and Contributor both allow managing resources — but they aren't equivalent.</p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's uniquely dangerous about Owner vs Contributor for an external guest account?</p>
            <div className="flex flex-col gap-2">
              {[
                "Owner can modify access control itself — the guest could grant further access to anyone",
                "Owner and Contributor are functionally identical, there's no real difference",
                "Owner just has a nicer name in the portal",
                "Contributor is actually more dangerous because it can delete resources",
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
          <p className="text-sm font-mono text-sage-400">Correct — Owner includes RBAC management itself, so the guest could escalate or grant access to anyone else, not just manage resources. Flag: {revealed.task_2 ?? "SAGE{…}"}</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Fix It" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">The partner does need some access to collaborate on the project — just not this much.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's the correct fix?</p>
            <div className="flex flex-col gap-2">
              {[
                "Remove the Owner assignment and replace it with a scoped custom role granting only what the partner needs",
                "Downgrade to Contributor at the same subscription-root scope",
                "Leave it as-is since they're a trusted partner",
                "Just rename the assignment for clarity",
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
            Correct — a scoped custom role matching the exact permissions needed replaces both the excess role and the excess scope in one fix.
            Flag: {revealed.task_3 ?? "SAGE{…}"}
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">{revealed.task_1 ?? "SAGE{…}"}</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">{revealed.task_2 ?? "SAGE{…}"}</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">{revealed.task_3 ?? "SAGE{…}"}</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
