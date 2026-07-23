"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const SUMMARY = `You fed 2.3 GB of firewall logs into an AI assistant for triage.
AI summary: "3 IPs show suspicious beaconing patterns: 45.33.12.9, 91.204.10.5, 12.88.4.201"

You have not yet independently examined the raw logs for these IPs.`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function AiAssistedThreatHuntingClient({
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
    if (checkFlag(t1Answer, "SAGE{4nalyst_v3r1f13s_41_sh0rtl1st}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. What's the one thing you must still do before treating this shortlist as fact?");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "As a force multiplier for triage and pattern-spotting, with a human analyst validating and making the final call") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Consider the right balance between AI assistance and human judgment during a hunt.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Sensitive data may leave your security boundary and end up stored or processed by an external provider") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Think about where the data physically goes when sent to a third-party AI tool.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Don't Skip Verification" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">Mid-hunt, an AI assistant produces this summary:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{SUMMARY}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Before acting on the AI's shortlist, what must the analyst still do?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — the analyst must independently verify the AI's shortlist against the raw evidence. Flag: SAGE&#123;4nalyst_v3r1f13s_41_sh0rtl1st&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Define the Right Role for AI" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-4">A junior analyst asks how much they should trust the AI's output going forward.</p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's the right way to use AI in a threat hunt?</p>
            <div className="flex flex-col gap-2">
              {[
                "As a force multiplier for triage and pattern-spotting, with a human analyst validating and making the final call",
                "As a full replacement for manual log review going forward",
                "Only for writing the final report, never for analysis",
                "As the sole decision-maker on which IPs to block",
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
          <p className="text-sm font-mono text-sage-400">Correct — AI augments triage speed, but a human analyst still validates and decides. Flag: SAGE&#123;4i_4ug3nts_hum4n_d0nt_r3pl4c3&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Flag the Data Risk" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">The 2.3 GB of firewall logs were sent to a third-party AI service for this triage.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's a risk of feeding raw sensitive log data into a third-party AI tool during a hunt?</p>
            <div className="flex flex-col gap-2">
              {[
                "Sensitive data may leave your security boundary and end up stored or processed by an external provider",
                "The AI tool will always automatically encrypt the data at rest",
                "There's no risk since AI providers never log any input data",
                "This only matters if the logs are already public",
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
            Correct — sending raw sensitive data to a third-party tool means it leaves your perimeter and provider policies now apply.
            Flag: SAGE&#123;d4t4_l34v3s_p3r1m3t3r_thr1rd_p4rty&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;4nalyst_v3r1f13s_41_sh0rtl1st&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;4i_4ug3nts_hum4n_d0nt_r3pl4c3&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;d4t4_l34v3s_p3r1m3t3r_thr1rd_p4rty&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
