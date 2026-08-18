"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn, verifyStage, useRevealedFlags } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const BUNDLE = `// main.bundle.js — shipped to every visitor's browser
const OPENAI_KEY = "sk-live-3f8a1c...redacted...";
fetch("https://api.openai.com/v1/chat/completions", {
  headers: { Authorization: \`Bearer \${OPENAI_KEY}\` },
});`;

const COST_SCENARIO = `Billing alert: $4,200 in LLM inference charges in the last 6 hours
Traffic: 40,000 requests from a single account, no rate limiting configured`;

export function SecureAiApisClient({
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
      setT1Error("Incorrect. Think about who can read a browser-shipped JS bundle.");
    }
  }

  async function submitT2(e: React.FormEvent) {
    e.preventDefault();
    const verdict = await verifyStage(labId, "task_2", t2Choice);
    if (verdict.correct) {
      setT2Error("");
      markDone("task_2", verdict.reveal);
    } else {
      setT2Error("Incorrect. Think about what would cap the damage a single account can do.");
    }
  }

  async function submitT3(e: React.FormEvent) {
    e.preventDefault();
    const verdict = await verifyStage(labId, "task_3", t3Choice);
    if (verdict.correct) {
      setT3Error("");
      markDone("task_3", verdict.reveal);
    } else {
      setT3Error("Incorrect. Rate limiting alone doesn't address manipulated inputs or unsafe outputs.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Find the Key Leak" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">A code review turns up this in the production JS bundle:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-red-300 whitespace-pre-wrap overflow-x-auto">{BUNDLE}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Where should the API key live instead?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — the key must live server-side only, never in code shipped to the browser. Flag: {revealed.task_1 ?? "SAGE{…}"}</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Stop the Cost DoS" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">A billing alert fires shortly after the fix:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{COST_SCENARIO}</pre>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What control addresses this cost-based denial of service risk?</p>
            <div className="flex flex-col gap-2">
              {[
                "Per-user rate limiting and request quotas on the LLM endpoint",
                "Rotating the API key every hour",
                "Switching to a cheaper LLM model",
                "Disabling logging to reduce overhead",
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
          <p className="text-sm font-mono text-sage-400">Correct — per-user rate limiting and quotas cap what any single account can spend. Flag: {revealed.task_2 ?? "SAGE{…}"}</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Round Out the Hardening" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">The key is secured and rate limiting is in place.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Besides rate limiting, what else should validate every incoming request to the AI API?</p>
            <div className="flex flex-col gap-2">
              {[
                "Input validation and output filtering, since the API sits between untrusted users and a model that can be manipulated",
                "Nothing else is needed once rate limiting is in place",
                "Only client-side JavaScript validation",
                "A CAPTCHA on every single request",
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
            Correct — validate every input and filter every output, since the model itself can be manipulated.
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
