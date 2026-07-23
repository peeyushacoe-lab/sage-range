"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const MAIL_RULE = `Mailbox rule found in ap-manager@corp.com (created by attacker):
IF subject or body contains "invoice"
THEN forward to: finance-docs-relay@outlook-mail-secure.com
AND move to Deleted Items (hides from inbox)`;

const FOLLOWUP_EMAIL = `Email sent from the compromised mailbox to Vendor Corp:
"Hi team, we've updated our banking details ahead of this month's payment.
Please use the new account info attached for the $58,000 invoice. Thanks!"`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function BusinessEmailCompromiseClient({
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
    if (checkFlag(t1Answer, "SAGE{4ut0f0rw4rd_1nv01c3_rul3}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Look at what the attacker's mailbox rule does with invoice-related emails.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "Invoice/payment redirection fraud, where the attacker changes payment details mid-transaction using a trusted compromised account") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Name the specific BEC technique this represents.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Contact the bank/vendor immediately to attempt to halt or recall the wire transfer before it's fully processed") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Think about what's still reversible if the money hasn't fully arrived yet.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Find the Malicious Mailbox Rule" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">A hidden rule discovered in the compromised mailbox:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{MAIL_RULE}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What malicious mailbox feature did the attacker create to intercept invoice communications?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — an auto-forward rule targeting invoice emails, hiding the originals, is the malicious feature. Flag: SAGE&#123;4ut0f0rw4rd_1nv01c3_rul3&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Name the Technique" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">The attacker then sent this from the compromised account:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-red-300 whitespace-pre-wrap overflow-x-auto">{FOLLOWUP_EMAIL}</pre>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's this specific BEC technique called?</p>
            <div className="flex flex-col gap-2">
              {[
                "Invoice/payment redirection fraud, where the attacker changes payment details mid-transaction using a trusted compromised account",
                "SIM swapping",
                "DNS cache poisoning",
                "Watering hole attack",
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
          <p className="text-sm font-mono text-sage-400">Correct — this is invoice/payment redirection fraud, using the compromised account's trust to change payment details. Flag: SAGE&#123;p4ym3nt_r3d1r3ct10n_fr4ud&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Race Against the Wire" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">You've just discovered this and the $58,000 payment may not have cleared yet.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Besides resetting the compromised account, what should be done immediately given money may already be in transit?</p>
            <div className="flex flex-col gap-2">
              {[
                "Contact the bank/vendor immediately to attempt to halt or recall the wire transfer before it's fully processed",
                "Wait for the vendor to notice the discrepancy on their own",
                "Only notify affected employees, not external parties",
                "Assume the money is already gone and skip any recall attempt",
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
            Correct — contacting the bank/vendor immediately gives the best chance to halt or recall the wire before it's finalized.
            Flag: SAGE&#123;4tt3mpt_w1r3_r3c4ll_1mm3d14t3ly&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;4ut0f0rw4rd_1nv01c3_rul3&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;p4ym3nt_r3d1r3ct10n_fr4ud&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;4tt3mpt_w1r3_r3c4ll_1mm3d14t3ly&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
