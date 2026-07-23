"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const SIGNIN = `Azure AD Sign-in Logs:
09:00:12  user: j.rivera@corp.com  location: Warsaw, Poland   result: Success
09:15:47  user: j.rivera@corp.com  location: Jakarta, Indonesia  result: Success`;

const ACTIVITY = `Azure Activity Log:
09:16:03  j.rivera@corp.com  "Add member to role" — assigned self to Global Administrator
09:16:40  j.rivera@corp.com  "Create service principal" — new app registration created`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function AzureLogsAnalysisClient({
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
    if (checkFlag(t1Answer, "SAGE{1mp0ss1bl3_tr4v3l_d3t3ct3d}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Consider whether someone could physically travel between these two locations in 15 minutes.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "Immediately revoke the newly created admin role assignment and force session/token revocation for the account") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. The account just granted itself Global Admin — what's the most urgent thing to undo?");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Sign-in logs show who authenticated when; activity logs show what actions were taken — together they reconstruct the full attack chain") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Think about what each log type shows that the other doesn't.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Spot the Anomaly" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">Azure AD sign-in logs for a user account:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{SIGNIN}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What does this sign-in pattern indicate?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — Warsaw to Jakarta in 15 minutes is physically impossible: classic impossible travel. Flag: SAGE&#123;1mp0ss1bl3_tr4v3l_d3t3ct3d&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Prioritize the Response" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">The Azure Activity Log shows what the account did next:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-red-300 whitespace-pre-wrap overflow-x-auto">{ACTIVITY}</pre>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What should be prioritized in response?</p>
            <div className="flex flex-col gap-2">
              {[
                "Immediately revoke the newly created admin role assignment and force session/token revocation for the account",
                "Wait for the user to confirm whether they made these changes",
                "Only reset the password, since role changes aren't urgent",
                "Delete the account entirely without further investigation",
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
          <p className="text-sm font-mono text-sage-400">Correct — revoke the admin role and force token revocation immediately to cut off further access. Flag: SAGE&#123;r3v0k3_4dm1n_r0l3_4nd_t0k3ns&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Explain the Log Pairing" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">A teammate asks why you pulled both log types instead of just one.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Why check both sign-in logs AND activity logs together rather than just one?</p>
            <div className="flex flex-col gap-2">
              {[
                "Sign-in logs show who authenticated when; activity logs show what actions were taken — together they reconstruct the full attack chain",
                "They contain identical information, so checking both is redundant",
                "Activity logs are deprecated and sign-in logs are the only reliable source",
                "Sign-in logs are only useful for billing purposes",
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
            Correct — combining who-authenticated-when with what-actions-followed reconstructs the full attack chain.
            Flag: SAGE&#123;c0mb1n3_s1gn1n_4nd_4ct1v1ty_l0gs&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;1mp0ss1bl3_tr4v3l_d3t3ct3d&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;r3v0k3_4dm1n_r0l3_4nd_t0k3ns&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;c0mb1n3_s1gn1n_4nd_4ct1v1ty_l0gs&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
