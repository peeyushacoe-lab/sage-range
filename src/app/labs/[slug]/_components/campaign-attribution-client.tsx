"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const EVIDENCE = `Evidence gathered on a multi-stage campaign:
1. Infrastructure overlap with a previously reported group   — Medium confidence
2. Custom malware family previously unique to that group     — High confidence
3. Targeting pattern matches that group's known sector focus — Medium confidence

No single piece of evidence is conclusive on its own.`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function CampaignAttributionClient({
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
    if (checkFlag(t1Answer, "SAGE{m0d3r4t3_c0nf1d3nc3_4ttr1but10n}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Weigh one high-confidence and two medium-confidence indicators together, not in isolation.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "Malware can be shared, leaked, sold, or false-flagged, so even strong single indicators need corroboration from other evidence types") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Think about how custom malware could end up outside its originating group's control.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "State the confidence level explicitly and show the supporting evidence, rather than presenting attribution as a certainty") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Consider how to avoid overstating certainty to stakeholders.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Weigh the Evidence" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">Evidence gathered across a multi-stage campaign investigation:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{EVIDENCE}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Using an admiralty-style confidence approach, what's the overall attribution confidence level here — low, moderate, or high?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — combined, this mix of medium and high confidence indicators supports a moderate overall confidence level. Flag: SAGE&#123;m0d3r4t3_c0nf1d3nc3_4ttr1but10n&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Question the Strongest Indicator" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-4">A manager wants to attribute this immediately based purely on the custom malware match.</p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Why shouldn't a single high-confidence indicator (like the custom malware) alone justify full attribution?</p>
            <div className="flex flex-col gap-2">
              {[
                "Malware can be shared, leaked, sold, or false-flagged, so even strong single indicators need corroboration from other evidence types",
                "High-confidence indicators are never wrong, but attribution rules require at least two sources anyway",
                "Malware families never change hands between groups",
                "It should be sufficient on its own — the manager's instinct is correct",
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
          <p className="text-sm font-mono text-sage-400">Correct — custom malware can be shared, leaked, or false-flagged, so it needs corroboration from other evidence. Flag: SAGE&#123;c0rr0b0r4t3_4cr0ss_3v1d3nc3_typ3s&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Write the Report Responsibly" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">Time to communicate this attribution to stakeholders.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's the responsible way to communicate this attribution in a report to stakeholders?</p>
            <div className="flex flex-col gap-2">
              {[
                "State the confidence level explicitly and show the supporting evidence, rather than presenting attribution as a certainty",
                "Present the attribution as a definitive fact to avoid confusing non-technical readers",
                "Omit the attribution section entirely since it can't be 100% certain",
                "Only share the attribution verbally, never in writing",
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
            Correct — explicitly stating confidence level and showing the evidence avoids overstating certainty to stakeholders.
            Flag: SAGE&#123;st4t3_c0nf1d3nc3_3xpl1c1tly&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;m0d3r4t3_c0nf1d3nc3_4ttr1but10n&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;c0rr0b0r4t3_4cr0ss_3v1d3nc3_typ3s&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;st4t3_c0nf1d3nc3_3xpl1c1tly&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
