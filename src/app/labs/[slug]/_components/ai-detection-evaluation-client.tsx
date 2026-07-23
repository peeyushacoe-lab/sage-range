"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const VENDOR_CLAIM = `Vendor pitch: "Our AI detection engine achieves 98% accuracy!"

Your test dataset: 100,000 network events, of which 99,000 are benign
and 1,000 are actual attacks.

A model that labels everything "benign" would score 99% accuracy.`;

const RESULTS = `Vendor engine results on your test set:
- Recall: 94% (caught 940 of 1,000 real attacks)
- False positives: 8,200 benign events flagged as attacks
- Analysts must review every flagged event manually`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function AiDetectionEvaluationClient({
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
    if (checkFlag(t1Answer, "SAGE{4ccur4cy_m1sl34d1ng_1mb4l4nc3d_d4t4}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. What would a trivial 'always predict benign' model score on this same dataset?");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "Precision and recall, since they account for the imbalance that accuracy alone hides") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. You need metrics that specifically account for the rare positive (attack) class.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Analyst alert fatigue, which causes real alerts to get missed or ignored over time") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Think about what happens to a SOC team drowning in false alarms.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Question the Headline Metric" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">A vendor pitches their AI detection engine:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{VENDOR_CLAIM}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Why is "98% accuracy" meaningless on its own here?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — on this imbalanced dataset, even a trivial always-benign model beats 98% accuracy. Flag: SAGE&#123;4ccur4cy_m1sl34d1ng_1mb4l4nc3d_d4t4&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Pick the Right Metrics" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-4">You need metrics that actually reflect performance on rare attack events.</p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Given the class imbalance, which two metrics actually matter for evaluating this detector?</p>
            <div className="flex flex-col gap-2">
              {[
                "Precision and recall, since they account for the imbalance that accuracy alone hides",
                "Just overall accuracy and total events processed per second",
                "Model file size and inference latency only",
                "The vendor's customer satisfaction score",
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
          <p className="text-sm font-mono text-sage-400">Correct — precision and recall surface what accuracy hides on imbalanced data. Flag: SAGE&#123;prec1s10n_4nd_rec4ll_m4tt3r&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Weigh the Real-World Cost" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-3">Testing the vendor's engine against your labeled dataset:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-red-300 whitespace-pre-wrap overflow-x-auto">{RESULTS}</pre>
        </div>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">The detector has high recall but a very high false-positive rate. What's the real-world cost of that?</p>
            <div className="flex flex-col gap-2">
              {[
                "Analyst alert fatigue, which causes real alerts to get missed or ignored over time",
                "No real cost — more alerts always means better security",
                "It only affects storage costs for log retention",
                "It means the model needs more training data, nothing else",
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
            Correct — 8,200 false positives a day drives alert fatigue, and real attacks start slipping through the noise.
            Flag: SAGE&#123;4l3rt_f4t1gu3_fr0m_f4ls3_p0s1t1v3s&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;4ccur4cy_m1sl34d1ng_1mb4l4nc3d_d4t4&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;prec1s10n_4nd_rec4ll_m4tt3r&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;4l3rt_f4t1gu3_fr0m_f4ls3_p0s1t1v3s&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
