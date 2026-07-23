"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const PROXY_LOG = `08:00:01  WKSTN-DEV-02 -> cdn-metrics-sync.info:443
08:01:02  WKSTN-DEV-02 -> cdn-metrics-sync.info:443
08:02:01  WKSTN-DEV-02 -> cdn-metrics-sync.info:443
08:03:03  WKSTN-DEV-02 -> cdn-metrics-sync.info:443
08:04:01  WKSTN-DEV-02 -> github.com:443
08:05:02  WKSTN-DEV-02 -> cdn-metrics-sync.info:443`;

const SPL_DRAFT = `index=proxy dest_port=443
| stats count by dest`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function SplunkDetectionHuntClient({
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
    if (checkFlag(t1Answer, "SAGE{60s_1nt3rv4l_b34c0n1ng}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Look at the gap between successive requests to cdn-metrics-sync.info.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "stats on time deltas between requests to the same destination, filtering for low variance/regular intervals") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. A simple count-by-destination query won't isolate the regular-interval pattern.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Pivot on that domain across ALL other hosts' proxy logs to find any other infected machines") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. One infected host is rarely the entire compromise footprint.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Spot the Beacon" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">A week of proxy logs for one workstation, condensed to the relevant lines:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{PROXY_LOG}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What interval pattern indicates likely C2 beaconing to cdn-metrics-sync.info?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — requests to that domain recur roughly every 60 seconds, a classic beacon interval. Flag: SAGE&#123;60s_1nt3rv4l_b34c0n1ng&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Write the Right Query" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">A colleague's first-pass SPL search:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{SPL_DRAFT}</pre>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Which SPL approach best isolates beaconing amid normal browsing traffic?</p>
            <div className="flex flex-col gap-2">
              {[
                "stats on time deltas between requests to the same destination, filtering for low variance/regular intervals",
                "The count-by-destination query above is already sufficient",
                "Filter only on dest_port=443, nothing else is needed",
                "Sort alphabetically by destination and read manually",
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
          <p className="text-sm font-mono text-sage-400">Correct — computing time deltas per destination and filtering for low variance surfaces regular-interval beacons that a plain count would miss. Flag: SAGE&#123;t1m3_d3lt4_v4r14nc3_4n4lys1s&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Pivot the Hunt" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">You've confirmed cdn-metrics-sync.info is a beaconing C2 domain on this one host.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's the next hunting step?</p>
            <div className="flex flex-col gap-2">
              {[
                "Pivot on that domain across ALL other hosts' proxy logs to find any other infected machines",
                "Close the investigation — one host is the full scope",
                "Block the domain but don't check any other hosts",
                "Wait for another alert before doing anything further",
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
            Correct — pivoting the confirmed indicator across the whole fleet's logs is how you find the full blast radius, not just the host you started with.
            Flag: SAGE&#123;p1v0t_4cr0ss_4ll_h0sts&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;60s_1nt3rv4l_b34c0n1ng&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;t1m3_d3lt4_v4r14nc3_4n4lys1s&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;p1v0t_4cr0ss_4ll_h0sts&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
