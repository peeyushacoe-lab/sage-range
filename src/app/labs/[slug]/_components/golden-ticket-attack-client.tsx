"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const SCENARIO = `Timeline reconstructed by IR:
- 6 weeks ago: undetected compromise of a domain controller
- Attacker dumped a specific account's NTLM hash during that compromise
- This week: attacker authenticates as "ceo_assistant" — an account that was deleted 3 weeks ago
- All affected user passwords were reset yesterday; attacker access continues unaffected`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function GoldenTicketAttackClient({
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
    if (checkFlag(t1Answer, "SAGE{krbtgt_4cc0unt_h4sh_st0l3n}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Think about which single account's hash can forge tickets for anyone, even deleted users.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "The forged ticket is signed with the KRBTGT hash itself, not tied to any individual user's password") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Consider what cryptographically signs a Golden Ticket.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Reset the KRBTGT password twice (to flush both current and previous hash versions), not just individual user passwords") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Individual user password resets, as seen in the scenario, clearly didn't stop the access.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Trace the Root Cause" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">IR timeline for a persistent, unexplained domain compromise:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{SCENARIO}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Which single account's hash, once stolen, enables forging tickets for anyone in the domain — even deleted users?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — the KRBTGT account's hash was stolen, letting the attacker forge tickets for any identity. Flag: SAGE&#123;krbtgt_4cc0unt_h4sh_st0l3n&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Explain the Persistence" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-4">Individual user password resets did nothing to stop the attacker's access.</p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Why can a Golden Ticket keep working even after the compromised user's password is reset?</p>
            <div className="flex flex-col gap-2">
              {[
                "The forged ticket is signed with the KRBTGT hash itself, not tied to any individual user's password",
                "Golden Tickets are stored locally and don't need domain validation",
                "Password resets don't take effect for 90 days by default",
                "The attacker also compromised the password reset process",
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
          <p className="text-sm font-mono text-sage-400">Correct — the ticket is signed by KRBTGT's hash, completely independent of the impersonated user's own password. Flag: SAGE&#123;s1gn3d_by_krbtgt_n0t_us3r_pw&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Write the Remediation" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">The organization needs a remediation that actually stops the bleeding.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's the only remediation that actually invalidates existing Golden Tickets?</p>
            <div className="flex flex-col gap-2">
              {[
                "Reset the KRBTGT password twice (to flush both current and previous hash versions), not just individual user passwords",
                "Reset the KRBTGT password once",
                "Reset every regular user's password twice",
                "Disable Kerberos and force NTLM-only authentication",
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
            Correct — resetting KRBTGT twice flushes both hash versions, invalidating every forged ticket.
            Flag: SAGE&#123;r3s3t_krbtgt_tw1c3&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;krbtgt_4cc0unt_h4sh_st0l3n&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;s1gn3d_by_krbtgt_n0t_us3r_pw&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;r3s3t_krbtgt_tw1c3&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
