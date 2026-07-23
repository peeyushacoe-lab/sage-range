"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const EMAIL = `From: "David Chen" <d.chen@acme-corp-finance.co>  (real CEO: d.chen@acmecorp.com)
Subject: Urgent — confidential wire needed before EOD

Hi Sarah,

I'm tied up in a board meeting and can't take calls right now. We have a
time-sensitive acquisition opportunity that requires a wire of $84,500 to
be sent today before 5 PM. I'll send the banking details separately — please
confirm you can process this and keep it confidential until we announce.

Thanks,
David`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function DetectAiGeneratedPhishingClient({
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
    if (checkFlag(t1Answer, "SAGE{n0_gr4mm4r_4w4rd_ph1sh1ng}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Compare this email's writing quality to old-school phishing.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "Behavioral and metadata signals — sender domain mismatch, urgency + payment request combo, unusual send time — rather than writing quality") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Since grammar checks fail, what other signals are still present here?");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Out-of-band verification of any payment/wire request through a separate, known-good channel") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Consider a control that works regardless of how convincing the email itself is.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Spot the Missing Tell" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">An email flagged by a finance employee:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{EMAIL}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What traditional phishing tell is now missing because AI wrote this email?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — the email has no grammar or spelling mistakes at all, unlike classic phishing. Flag: SAGE&#123;n0_gr4mm4r_4w4rd_ph1sh1ng&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Shift Your Detection Focus" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-4">Grammar-based filters won't catch this one.</p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Since grammar is no longer a reliable signal, what should detection focus on instead?</p>
            <div className="flex flex-col gap-2">
              {[
                "Behavioral and metadata signals — sender domain mismatch, urgency + payment request combo, unusual send time — rather than writing quality",
                "Blocking all emails that mention money",
                "Requiring every email to be manually approved by IT",
                "Disabling email entirely for finance staff",
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
          <p className="text-sm font-mono text-sage-400">Correct — domain mismatch, urgency, and payment requests together are the real signal now. Flag: SAGE&#123;f0cus_0n_m3t4d4t4_n0t_wr1t1ng&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Recommend the Control" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">Even a well-tuned detection filter can't catch every attempt.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's the most reliable technical control against this kind of CEO-fraud attack, regardless of how well-written it is?</p>
            <div className="flex flex-col gap-2">
              {[
                "Out-of-band verification of any payment/wire request through a separate, known-good channel",
                "Requiring all emails to be signed with PGP",
                "Blocking all external domains that resemble internal ones",
                "Training the spam filter on more phishing samples",
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
            Correct — verifying wire requests through a separate known-good channel defeats this regardless of email quality.
            Flag: SAGE&#123;0ut_0f_b4nd_v3r1f1c4t10n&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;n0_gr4mm4r_4w4rd_ph1sh1ng&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;f0cus_0n_m3t4d4t4_n0t_wr1t1ng&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;0ut_0f_b4nd_v3r1f1c4t10n&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
