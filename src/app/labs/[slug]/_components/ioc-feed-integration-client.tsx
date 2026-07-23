"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const FEEDS = `Feed A: IP 45.33.10.12            Confidence: High    Age: 2 days
Feed B: IP 45.33.10.12            Confidence: Low     Age: 45 days
Feed C: Domain cdn-edge-01[.]net  Confidence: Medium  Age: 6 hours`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function IocFeedIntegrationClient({
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
    if (checkFlag(t1Answer, "SAGE{h1gh_c0nf1d3nc3_r3c3nt_4g3_w1ns}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Weigh both the confidence level and how recently each feed saw the indicator.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "Add it to a monitoring/alerting watchlist first, not an auto-block list, until it's corroborated") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. One medium-confidence source alone shouldn't drive an enforcement action.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "High confidence AND corroborated by multiple independent feeds, minimizing false-positive blocking risk") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Think about the bar that minimizes the risk of blocking something legitimate.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Resolve Conflicting Entries" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">Two threat intel feeds return conflicting data on the same IP:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{FEEDS}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Which value should you trust for 45.33.10.12, and why?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — the more recent, higher-confidence report should win over an older, lower-confidence one. Flag: SAGE&#123;h1gh_c0nf1d3nc3_r3c3nt_4g3_w1ns&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Decide the Domain's Treatment" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-4">The domain cdn-edge-01[.]net has only medium confidence from a single feed, seen 6 hours ago.</p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's the right integration action for this indicator?</p>
            <div className="flex flex-col gap-2">
              {[
                "Add it to a monitoring/alerting watchlist first, not an auto-block list, until it's corroborated",
                "Auto-block it immediately at the firewall",
                "Ignore it entirely since it's only medium confidence",
                "Escalate it as a critical incident right away",
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
          <p className="text-sm font-mono text-sage-400">Correct — monitor it first; a single medium-confidence source isn't a strong enough bar for automatic enforcement. Flag: SAGE&#123;m0n1t0r_f1rst_n0t_4ut0_bl0ck&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Set the Auto-Block Bar" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">You need a written policy for when an indicator can skip human review and go straight to auto-block.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's the right criteria for auto-blocking an IOC with no human review?</p>
            <div className="flex flex-col gap-2">
              {[
                "High confidence AND corroborated by multiple independent feeds, minimizing false-positive blocking risk",
                "Any IOC from any feed, regardless of confidence, should be auto-blocked immediately",
                "Only IOCs older than 30 days, since they're proven",
                "Confidence level doesn't matter as long as it's an IP address",
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
            Correct — requiring both high confidence and multi-feed corroboration keeps auto-blocking safe from single-source false positives.
            Flag: SAGE&#123;h1gh_c0nf_multi_f33d_4ut0bl0ck&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;h1gh_c0nf1d3nc3_r3c3nt_4g3_w1ns&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;m0n1t0r_f1rst_n0t_4ut0_bl0ck&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;h1gh_c0nf_multi_f33d_4ut0bl0ck&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
