"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const VALIDATION_RESULTS = `Rule: "Suspicious PowerShell Encoded Command"
Alerts fired: 340 over 7 days
True positives (confirmed malicious): 6
False positives (confirmed benign, e.g. admin scripts): 334`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function DetectionValidationClient({
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
    if (checkFlag(t1Answer, "SAGE{98_p3rc3nt_f4ls3_p0s1t1v3_r4t3}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Divide false positives by total alerts fired.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "No — a 98% false-positive rate means auto-blocking would constantly disrupt legitimate admin work") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Think about what would happen to legitimate admin activity under blocking mode at this rate.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Add exclusions for known-legitimate encoded PowerShell sources (e.g. signed admin scripts) and re-baseline") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Look at what the 334 false positives most likely have in common.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Measure the Rule" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">A week-long validation run for a new detection rule:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{VALIDATION_RESULTS}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What is this rule's false-positive rate?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — 334 of 340 alerts were false positives, roughly 98%. Flag: SAGE&#123;98_p3rc3nt_f4ls3_p0s1t1v3_r4t3&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Decide on Blocking Mode" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-4">Your team is considering switching this rule from alert-only to auto-response (blocking) mode.</p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Is this rule ready to run in blocking/auto-response mode?</p>
            <div className="flex flex-col gap-2">
              {[
                "No — a 98% false-positive rate means auto-blocking would constantly disrupt legitimate admin work",
                "Yes — any rule that catches real malware should block immediately",
                "Yes, since 6 true positives proves it works",
                "It doesn't matter, blocking mode has no real downside",
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
          <p className="text-sm font-mono text-sage-400">Correct — at 98% false positives, blocking mode would break legitimate admin work far more often than it stops real attacks. Flag: SAGE&#123;n0t_r34dy_f0r_4ut0_bl0ck&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Tune Before Reconsidering" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">You want to fix the rule instead of abandoning it entirely.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's the right next step before reconsidering blocking mode?</p>
            <div className="flex flex-col gap-2">
              {[
                "Add exclusions for known-legitimate encoded PowerShell sources (e.g. signed admin scripts) and re-baseline",
                "Delete the rule entirely and never revisit it",
                "Lower the alert threshold so it fires even more often",
                "Leave it running in alert-only mode forever with no changes",
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
            Correct — excluding known-legitimate sources and re-baselining is how you get this rule to a state worth reconsidering for blocking.
            Flag: SAGE&#123;3xclud3_kn0wn_g00d_r3b4s3l1n3&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;98_p3rc3nt_f4ls3_p0s1t1v3_r4t3&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;n0t_r34dy_f0r_4ut0_bl0ck&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;3xclud3_kn0wn_g00d_r3b4s3l1n3&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
