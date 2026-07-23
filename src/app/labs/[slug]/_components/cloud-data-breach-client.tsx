"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const POLICY_HISTORY = `Bucket policy change history — s3://acme-customer-records:
2026-04-30  Config change deployed: "public-read" ACL accidentally enabled
2026-05-02  First external (non-corporate IP) GetObject requests observed
2026-06-14  Misconfiguration discovered during unrelated security review (45 days later)`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function CloudDataBreachClient({
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
    if (checkFlag(t1Answer, "SAGE{2_d4ys_t0_f1rst_3xt3rn4l_4cc3ss}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Compare the config change date against the first external access date.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "There was no automated monitoring/alerting for public bucket exposure, leaving the misconfiguration undetected for over a month") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Think about what a 45-day detection gap says about the organization's monitoring.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Breach notification to affected customers and relevant regulators, since unauthorized access to personal data was confirmed") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Think about the legal obligations that follow confirmed unauthorized access to personal data.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Determine the Exposure Window" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">Bucket policy change history reconstructed during the investigation:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{POLICY_HISTORY}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">How many days was the bucket realistically exposed before external downloads began?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — external downloads began 2 days after the misconfiguration was introduced. Flag: SAGE&#123;2_d4ys_t0_f1rst_3xt3rn4l_4cc3ss&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Diagnose the Root Control Gap" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-4">The misconfiguration went undiscovered for 45 days, found only during an unrelated review.</p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What does the 45-day gap between the misconfiguration and its discovery reveal about the organization's controls?</p>
            <div className="flex flex-col gap-2">
              {[
                "There was no automated monitoring/alerting for public bucket exposure, leaving the misconfiguration undetected for over a month",
                "The organization has excellent detection capabilities",
                "45 days is actually a fast detection time for cloud misconfigurations",
                "It shows the attacker was extremely stealthy, not a control gap",
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
          <p className="text-sm font-mono text-sage-400">Correct — no automated exposure monitoring existed, letting a critical misconfiguration sit unnoticed for over a month. Flag: SAGE&#123;n0_4ut0m4t3d_3xp0sur3_m0n1t0r1ng&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Address the Legal Obligation" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">The bucket is now fixed, but customer data was confirmed accessed externally.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Beyond fixing the bucket policy, what regulatory/legal step is likely required given confirmed external access to customer data?</p>
            <div className="flex flex-col gap-2">
              {[
                "Breach notification to affected customers and relevant regulators, since unauthorized access to personal data was confirmed",
                "No further action is needed once the bucket is fixed",
                "Only an internal memo to the security team is required",
                "Notification is only required if the data was definitely downloaded, not just accessed",
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
            Correct — confirmed unauthorized access to personal data typically requires notifying affected customers and regulators.
            Flag: SAGE&#123;br34ch_n0t1f1c4t10n_r3qu1r3d&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;2_d4ys_t0_f1rst_3xt3rn4l_4cc3ss&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;n0_4ut0m4t3d_3xp0sur3_m0n1t0r1ng&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;br34ch_n0t1f1c4t10n_r3qu1r3d&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
