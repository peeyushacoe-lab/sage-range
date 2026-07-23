"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const ROLE_ASSIGNMENTS = `Role Assignments — Subscription "Prod-EastUS":
  user: alice@acmecorp.com         Role: Contributor   Scope: Resource Group "app-prod"
  user: guest_bob@partnerco.com    Role: Owner         Scope: Subscription (root)
  user: svc-ci-pipeline            Role: Contributor   Scope: Resource Group "app-prod"
  group: SecurityTeam              Role: Reader        Scope: Subscription (root)`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function AzureRbacMisconfigurationClient({
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
    if (checkFlag(t1Answer, "SAGE{gu3st_b0b_0wn3r_r00t_sc0p3}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Check both the role AND the scope for each assignment.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "Owner can modify access control itself — the guest could grant further access to anyone") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Think about what Owner grants that Contributor specifically doesn't.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Remove the Owner assignment and replace it with a scoped custom role granting only what the partner needs") {
      setT3Error("");
      void saveStage("task_3");
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
          <p className="text-sm font-mono text-sage-400">Correct — an external guest account holds Owner at the subscription root, the widest possible scope. Flag: SAGE&#123;gu3st_b0b_0wn3r_r00t_sc0p3&#125;</p>
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
          <p className="text-sm font-mono text-sage-400">Correct — Owner includes RBAC management itself, so the guest could escalate or grant access to anyone else, not just manage resources. Flag: SAGE&#123;0wn3r_c4n_r3gr4nt_4cc3ss&#125;</p>
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
            Flag: SAGE&#123;sc0p3d_cust0m_r0l3_f1x&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;gu3st_b0b_0wn3r_r00t_sc0p3&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;0wn3r_c4n_r3gr4nt_4cc3ss&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;sc0p3d_cust0m_r0l3_f1x&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
