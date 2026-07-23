"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const ACL = `Object: DC=corp,DC=local
Trustee: svc_reporting (member of: Domain Users)
Permissions granted: Replicating Directory Changes, Replicating Directory Changes All

Trustee: Domain Admins
Permissions granted: Replicating Directory Changes, Replicating Directory Changes All (expected)`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function DcsyncAttackClient({
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
    if (checkFlag(t1Answer, "SAGE{r3pl1c4t1ng_d1r3ct0ry_ch4ng3s_4ll}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Look for the permission granted to a non-DC, non-admin account on the domain object.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "It rides the legitimate domain replication protocol, so it looks like normal DC-to-DC traffic rather than an obvious file access") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Compare this to directly copying NTDS.dit off a domain controller's disk.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Remove the replication permission from the non-DC account and audit for any other accounts with the same unnecessary grant") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Think about the permission itself, and whether other accounts might have the same issue.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Find the Dangerous Permission" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">ACL excerpt on the domain object:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{ACL}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Which permission, granted to a low-privilege account, enables DCSync?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — svc_reporting has "Replicating Directory Changes All" — the permission that enables DCSync. Flag: SAGE&#123;r3pl1c4t1ng_d1r3ct0ry_ch4ng3s_4ll&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Understand the Stealth" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-4">DCSync often goes undetected for far longer than a direct NTDS.dit theft.</p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Why is DCSync so hard to detect compared to dumping the NTDS.dit file directly?</p>
            <div className="flex flex-col gap-2">
              {[
                "It rides the legitimate domain replication protocol, so it looks like normal DC-to-DC traffic rather than an obvious file access",
                "It doesn't actually access any password data",
                "It only works over an encrypted channel invisible to any logging",
                "It requires physical access to a domain controller",
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
          <p className="text-sm font-mono text-sage-400">Correct — it blends in as normal DC replication traffic rather than an obvious file-access event. Flag: SAGE&#123;l00ks_l1k3_l3g1t_r3pl1c4t10n&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Remediate the Finding" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">svc_reporting shouldn't have this permission at all.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's the right remediation once this permission grant is found?</p>
            <div className="flex flex-col gap-2">
              {[
                "Remove the replication permission from the non-DC account and audit for any other accounts with the same unnecessary grant",
                "Disable the domain controller until the issue is patched",
                "Reset every user's password in the domain",
                "Ignore it since the account is only used for reporting",
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
            Correct — revoke the replication permission and audit the domain for any other accounts holding it unnecessarily.
            Flag: SAGE&#123;r3v0k3_r3pl_perm_4ud1t_0th3rs&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;r3pl1c4t1ng_d1r3ct0ry_ch4ng3s_4ll&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;l00ks_l1k3_l3g1t_r3pl1c4t10n&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;r3v0k3_r3pl_perm_4ud1t_0th3rs&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
