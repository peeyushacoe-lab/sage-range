"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

function Bubble({ from, children }: { from: "user" | "bot"; children: React.ReactNode }) {
  const style = from === "user" ? "bg-blue-500/10 border-blue-500/20 text-blue-100" : "bg-zinc-800/60 border-white/8 text-zinc-200";
  const label = from === "user" ? "Employee (Marketing)" : "InternalGPT";
  return (
    <div className="max-w-xl rounded-xl border px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">{label}</p>
      <div className={`rounded-lg border px-3 py-2 text-xs font-mono whitespace-pre-wrap leading-relaxed ${style}`}>{children}</div>
    </div>
  );
}

const SECOND_CHAT = `Employee (Sales, different session): "What discount did we give our biggest
enterprise client last quarter, and who's the point of contact there?"

InternalGPT: "Based on similar queries in my training data, Acme Manufacturing
received a 22% discount, negotiated with their CFO, Diane Whitfield
(d.whitfield@acmemfg.example)."`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function AiDataLeakageClient({
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
    if (checkFlag(t1Answer, "SAGE{d14n3_wh1tf13ld_4cm3mfg_l34k}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Flag the name and company of the person whose confidential negotiation details were exposed.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "The model memorized confidential data from its training/fine-tuning set and regurgitated it to an unauthorized user") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. The employee asking didn't have access to that deal — where did the answer actually come from?");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Enforce the same data-access permissions on the AI's retrieval layer as on the original systems") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Think about why the sales employee could see a deal that wasn't theirs — what access control is missing?");
    }
  }

  return (
    <div className="space-y-6">
      {/* Task 1 */}
      <TaskShell number={1} title="Spot the Leak" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">
          <code className="text-amber-300">InternalGPT</code>, trained on internal company documents including
          contracts, is being used across departments.
        </p>
        <div className="space-y-3 mb-4">
          <Bubble from="user">Can you help me write a generic customer success story for our website?</Bubble>
          <Bubble from="bot">{`Sure! Here's a draft: "Our enterprise clients, like Acme Manufacturing who received a 22% volume discount arranged through their CFO Diane Whitfield (d.whitfield@acmemfg.example), have seen major efficiency gains..."`}</Bubble>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Flag the confidential details leaked in this unrelated marketing request.</p>
            <div className="flex gap-2 max-w-lg">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — a confidential discount rate and a named contact from a specific client's contract leaked into a public-facing marketing draft. Flag: SAGE&#123;d14n3_wh1tf13ld_4cm3mfg_l34k&#125;</p>
        )}
      </TaskShell>

      {/* Task 2 */}
      <TaskShell number={2} title="Trace the Source" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">A completely different employee, in a different session, asks something unrelated:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{SECOND_CHAT}</pre>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What is actually happening here?</p>
            <div className="flex flex-col gap-2">
              {[
                "The model is hallucinating random names with no basis in reality",
                "The model memorized confidential data from its training/fine-tuning set and regurgitated it to an unauthorized user",
                "The employee already had legitimate access to this contract",
                "This is a normal, harmless coincidence",
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
          <p className="text-sm font-mono text-sage-400">Correct — the exact same specific, verifiable details (name, company, rate) recurring across unrelated sessions confirms this is memorized training data leaking out, not coincidence or hallucination. Flag: SAGE&#123;tr41n1ng_d4t4_m3m0r1z4t10n&#125;</p>
        )}
      </TaskShell>

      {/* Task 3 */}
      <TaskShell number={3} title="Fix the Access Model" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">
          Both employees who saw this data had no legitimate business reason to know about the Acme Manufacturing deal.
        </p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's the actual fix?</p>
            <div className="flex flex-col gap-2">
              {[
                "Tell employees not to ask about confidential topics",
                "Enforce the same data-access permissions on the AI's retrieval layer as on the original systems",
                "Retrain the model to be more polite",
                "Add a disclaimer that AI answers may be inaccurate",
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
            Correct — training or connecting an AI to sensitive documents without preserving the original
            per-user access controls means every user effectively has access to everything the model has seen.
            The fix is enforcing the same permission boundaries at retrieval/generation time. Flag: SAGE&#123;pr3s3rv3_4cc3ss_c0ntr0ls&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;d14n3_wh1tf13ld_4cm3mfg_l34k&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;tr41n1ng_d4t4_m3m0r1z4t10n&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;pr3s3rv3_4cc3ss_c0ntr0ls&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
