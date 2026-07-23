"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const FEATURE = `New feature: customer support chatbot
- Can read and answer questions about a customer's own orders
- Has function-calling access to internal order DB: lookupOrder(), issueRefund(), cancelOrder()
- Any authenticated customer can chat with it`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function AiThreatModelingClient({
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
    if (checkFlag(t1Answer, "SAGE{prompt_1nject10n_4bus1ng_funct10ns}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. What could manipulate the model into calling issueRefund() on someone else's order?");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "Enforce strict server-side authorization checks on every function call, never trusting the model's decision alone") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. The fix can't depend on the model behaving correctly by itself.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "LLM behavior is probabilistic and can be manipulated via prompt injection, so you can't rely on the model's judgment as a security boundary") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Think about how deterministic — or not — an LLM's decisions really are.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Identify the Top Threat" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">A new feature is about to ship. Its design:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{FEATURE}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What's the single biggest threat category here, given the chatbot can invoke database functions on the user's behalf?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — prompt injection could trick the model into abusing its own function-calling access. Flag: SAGE&#123;prompt_1nject10n_4bus1ng_funct10ns&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Choose the Mitigation" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-4">You need to write the mitigation for this before launch.</p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Which mitigation matters most for function-calling abuse via prompt injection?</p>
            <div className="flex flex-col gap-2">
              {[
                "Enforce strict server-side authorization checks on every function call, never trusting the model's decision alone",
                "Add a disclaimer to the chat interface warning users about AI limitations",
                "Increase the model's context window size",
                "Rely on the system prompt telling the model not to misbehave",
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
          <p className="text-sm font-mono text-sage-400">Correct — every function call needs independent server-side authorization, regardless of what the model decided. Flag: SAGE&#123;s3rv3r_s1d3_4uth_0n_funct10n_c4ll&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Push Back on a Bad Assumption" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">A teammate argues the system prompt instructions are mitigation enough.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Why is "the model would never do that" not a valid threat mitigation?</p>
            <div className="flex flex-col gap-2">
              {[
                "LLM behavior is probabilistic and can be manipulated via prompt injection, so you can't rely on the model's judgment as a security boundary",
                "Because LLMs are always malicious by default",
                "Because system prompts are publicly visible to all users",
                "Because function calling doesn't actually execute real code",
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
            Correct — probabilistic, manipulable model behavior can never serve as a hard security boundary on its own.
            Flag: SAGE&#123;m0d3l_judgm3nt_n0t_4_s3cur1ty_b0und4ry&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;prompt_1nject10n_4bus1ng_funct10ns&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;s3rv3r_s1d3_4uth_0n_funct10n_c4ll&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;m0d3l_judgm3nt_n0t_4_s3cur1ty_b0und4ry&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
