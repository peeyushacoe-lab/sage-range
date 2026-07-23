"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const TTPS = `Observed TTPs:
- Spearphishing emails with macro-laden Word documents, tailored to specific job titles
- Cobalt Strike beacon deployed post-execution
- Targets exclusively APAC-region finance sector organizations
- Dwell time before objective: 3+ months (no rush to monetize)`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function ThreatActorProfilingClient({
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
    if (checkFlag(t1Answer, "SAGE{t4rg3t3d_4pt_styl3_1ntrus10n}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Consider the tailored targeting and patient dwell time here.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "It lets defenders anticipate likely next moves and apply relevant known mitigations, even under attribution uncertainty") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Think about the practical defensive value of a profile match, not naming rights.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "TTPs can be copied or shared between groups, so overlap alone isn't proof of the same actor") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Consider how unique any single technique really is across different threat groups.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Classify the Activity" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">Observed TTPs from a recent intrusion:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{TTPS}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What class of activity does this TTP combination represent — commodity crimeware or a targeted APT-style intrusion?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — tailored targeting, patient dwell time, and sector focus point to a targeted APT-style intrusion. Flag: SAGE&#123;t4rg3t3d_4pt_styl3_1ntrus10n&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Explain the Value of Profiling" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-4">You've matched these TTPs to a known reported threat actor profile, though not with certainty.</p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Why is matching TTPs to a known actor profile useful even without 100% certainty?</p>
            <div className="flex flex-col gap-2">
              {[
                "It lets defenders anticipate likely next moves and apply relevant known mitigations, even under attribution uncertainty",
                "It's only useful for writing a more dramatic incident report",
                "It has no practical value unless attribution is 100% certain",
                "It's mainly useful for law enforcement, not defenders",
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
          <p className="text-sm font-mono text-sage-400">Correct — profile matching helps anticipate next moves and apply known mitigations, even under uncertainty. Flag: SAGE&#123;4nt1c1p4t3_n3xt_m0v3s_fr0m_pr0f1l3&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Apply a Healthy Caution" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">A colleague wants to name a specific actor group in the final report based on the TTP match alone.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's a caution when attributing this intrusion to a specific named actor?</p>
            <div className="flex flex-col gap-2">
              {[
                "TTPs can be copied or shared between groups, so overlap alone isn't proof of the same actor",
                "TTPs are always unique to exactly one group, so this is definitive proof",
                "Attribution doesn't matter once mitigations are in place",
                "Cobalt Strike is only ever used by a single known actor",
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
            Correct — TTP overlap alone isn't proof, since techniques and tools can be shared or copied between groups.
            Flag: SAGE&#123;ttp_0v3rl4p_n0t_pr00f&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;t4rg3t3d_4pt_styl3_1ntrus10n&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;4nt1c1p4t3_n3xt_m0v3s_fr0m_pr0f1l3&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;ttp_0v3rl4p_n0t_pr00f&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
