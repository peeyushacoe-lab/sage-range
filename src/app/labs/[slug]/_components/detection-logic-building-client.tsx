"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn, verifyStage, useRevealedFlags } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const LOGIN_DATA = `Normal daily noise: ~15 failed logins/day, spread across ~5 different accounts, no pattern
Suspicious window: 480 failed logins in 10 minutes, across 460 distinct usernames, all from 1 source IP`;

export function DetectionLogicBuildingClient({
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
      setT1Error("Incorrect. Compare the suspicious window to normal daily noise on two dimensions.");
    }
  }

  async function submitT2(e: React.FormEvent) {
    e.preventDefault();
    const verdict = await verifyStage(labId, "task_2", t2Choice);
    if (verdict.correct) {
      setT2Error("");
      markDone("task_2", verdict.reveal);
    } else {
      setT2Error("Incorrect. Think about what happens if only ONE of the two conditions were required.");
    }
  }

  async function submitT3(e: React.FormEvent) {
    e.preventDefault();
    const verdict = await verifyStage(labId, "task_3", t3Choice);
    if (verdict.correct) {
      setT3Error("");
      markDone("task_3", verdict.reveal);
    } else {
      setT3Error("Incorrect. A single fixed number won't fit every environment or time of day.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Spot the Pattern" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">Login activity from two different windows on the same environment:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{LOGIN_DATA}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What two conditions, combined, distinguish credential stuffing from normal noise here?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — high failed-login volume combined with a large number of distinct usernames from one source. Flag: {revealed.task_1 ?? "SAGE{…}"}</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Choose the Logic Operator" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-4">You're writing the actual detection rule using these two conditions as inputs.</p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Should the rule use AND or OR logic between the two conditions?</p>
            <div className="flex flex-col gap-2">
              {[
                "AND — both conditions together, or you'll drown in false positives from either alone",
                "OR — either condition alone is enough to fire",
                "It doesn't matter, both produce identical results",
                "Neither — use a single condition instead",
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
          <p className="text-sm font-mono text-sage-400">Correct — requiring both conditions together (AND) keeps normal noise from tripping the rule on its own. Flag: {revealed.task_2 ?? "SAGE{…}"}</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Set the Thresholds" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">A fixed number like "500 failed logins" would work today, but every environment and time of day differs.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What threshold-tuning approach avoids both false positives and missed detections?</p>
            <div className="flex flex-col gap-2">
              {[
                "Baseline normal login volume/diversity per IP over time, then alert only on statistically significant deviations",
                "Use a single hardcoded number that never changes",
                "Set the threshold as low as possible to catch everything",
                "Skip thresholds entirely and alert on every failed login",
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
            Correct — a baseline-driven, statistically-derived threshold adapts to each environment instead of guessing a fixed number.
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
