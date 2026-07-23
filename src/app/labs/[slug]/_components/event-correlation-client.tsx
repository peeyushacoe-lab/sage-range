"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const LOGS = `Host A — Security 4624:  LogonId 0x3E7A21, user svc_deploy, 2026-05-11 22:01:04
Host B — Sysmon 3 (Network): LogonId 0x3E7A21, powershell.exe -> 10.0.9.44:445, 2026-05-11 22:03:10
Host C — Security 4672: LogonId 0x3E7A21, Special privileges assigned, 2026-05-11 22:04:55`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function EventCorrelationClient({
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
    if (checkFlag(t1Answer, "SAGE{l0g0n1d_0x3e7a21_c0rr3l4t10n}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Look for a field value shared across all three log lines.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "The attacker logged onto Host A, pivoted over SMB to Host B, then escalated to special/admin privileges on Host C — all under one session") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Read the three timestamped events in order as one continuous story.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Kill/disable that specific Logon ID's session and force credential rotation for svc_deploy everywhere it has access") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Think about what containment action is scoped exactly to what you've proven so far.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Find the Common Thread" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">Three log entries from three different hosts, pulled during the same incident window:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{LOGS}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What single identifier ties all three log entries to the same attacker session?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — Logon ID 0x3E7A21 appears in all three entries, tying them to one session. Flag: SAGE&#123;l0g0n1d_0x3e7a21_c0rr3l4t10n&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Read the Merged Story" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-4">With the Logon ID confirmed, the three hosts' events form one continuous timeline.</p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What does this merged timeline prove happened?</p>
            <div className="flex flex-col gap-2">
              {[
                "The attacker logged onto Host A, pivoted over SMB to Host B, then escalated to special/admin privileges on Host C — all under one session",
                "Three unrelated administrators happened to use the same account coincidentally",
                "Host C's event is unrelated noise and should be discarded",
                "This proves nothing without additional packet capture evidence",
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
          <p className="text-sm font-mono text-sage-400">Correct — one session, logon on Host A, SMB pivot to Host B, privilege escalation on Host C. Flag: SAGE&#123;s1ngl3_s3ss10n_multi_h0st_p1v0t&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Contain the Session" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">You've confirmed one Logon ID spans all three compromised hosts.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's the single most useful containment action here?</p>
            <div className="flex flex-col gap-2">
              {[
                "Kill/disable that specific Logon ID's session and force credential rotation for svc_deploy everywhere it has access",
                "Reboot all three hosts and hope the session clears",
                "Disable the entire domain until further notice",
                "Wait for the session to expire naturally",
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
            Correct — killing the session and rotating svc_deploy's credentials everywhere it has access closes the exact door that was used, without over-reacting.
            Flag: SAGE&#123;k1ll_s3ss10n_r0t4t3_cr3ds&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;l0g0n1d_0x3e7a21_c0rr3l4t10n&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;s1ngl3_s3ss10n_multi_h0st_p1v0t&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;k1ll_s3ss10n_r0t4t3_cr3ds&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
