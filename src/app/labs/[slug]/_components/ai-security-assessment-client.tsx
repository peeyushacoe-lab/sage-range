"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const ARCHITECTURE = `Internal LLM app architecture:
- Base model fine-tuned on 3 years of raw internal support tickets
- Support tickets contain customer names, emails, and account details in free text
- Served via an internal API, accessible to any employee`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function AiSecurityAssessmentClient({
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
    if (checkFlag(t1Answer, "SAGE{p11_m3m0r1z3d_1n_f1n3tun3d_m0d3l}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Think about what's inside those raw support tickets used for training.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "The model may regurgitate memorized PII from training data in its responses to any user") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Think about who can query the model and what it might reveal to them.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Add output filtering/DLP scanning on model responses to catch and redact leaked PII before it reaches the user") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Retraining is expensive and slow — think of a mitigation you can add on top of the existing model.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Spot the Data Risk" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">The architecture of an internally-deployed LLM app:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{ARCHITECTURE}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What data risk exists purely from the choice of training data here?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — customer PII from the tickets can end up memorized inside the fine-tuned model. Flag: SAGE&#123;p11_m3m0r1z3d_1n_f1n3tun3d_m0d3l&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Prioritize the Finding" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-4">The assessment turns up several findings — this one needs to be triaged first.</p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Which assessment finding is most urgent to fix first?</p>
            <div className="flex flex-col gap-2">
              {[
                "The model may regurgitate memorized PII from training data in its responses to any user",
                "The API response times are slower than the marketing team would like",
                "The model's fine-tuning used an older base model version",
                "The internal API doesn't have a custom logo on its docs page",
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
          <p className="text-sm font-mono text-sage-400">Correct — any employee querying the model could trigger it to leak another customer's memorized PII. Flag: SAGE&#123;m0d3l_c4n_l34k_tr41n1ng_p11&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Recommend a Mitigation" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">Retraining the model on scrubbed data will take months.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's a mitigation for training-data memorization leakage besides retraining?</p>
            <div className="flex flex-col gap-2">
              {[
                "Add output filtering/DLP scanning on model responses to catch and redact leaked PII before it reaches the user",
                "Increase the model's temperature setting",
                "Disable the internal API's authentication",
                "Just tell employees not to ask about customer data",
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
            Correct — output filtering/DLP scanning can catch and redact leaked PII before it reaches a user, as an immediate mitigation.
            Flag: SAGE&#123;0utput_dlp_f1lt3r1ng&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;p11_m3m0r1z3d_1n_f1n3tun3d_m0d3l&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;m0d3l_c4n_l34k_tr41n1ng_p11&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;0utput_dlp_f1lt3r1ng&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
