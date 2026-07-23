"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const PULSE_A = `Pulse: "QuietPanda Backdoor - Q1 Campaign"
Author: ThreatIntelCollective (verified vendor account)
TLP: TLP:GREEN
Created: 2026-01-14
Subscribers: 1,842
Indicators: 27 (14 domains, 9 IPs, 4 file hashes)
Malware family: QuietPanda
References: 3 linked vendor writeups`;

const PULSE_B = `Pulse: "Random APT Indicators"
Author: anon_user_88 (unverified, joined 2 days ago)
TLP: TLP:RED
Created: 2026-01-14
Subscribers: 3
Indicators: 4 (no context, no references)`;

const IOC_LIST = `Selected Pulse A Indicators (subset):
  IP: 45.77.12.90
  IP: 91.223.10.15
  Domain: cdn-panda-update[.]net
  Hash: 9f86d081884c7d659a2feaa0c55ad015`;

const FIREWALL_LOG = `2026-01-15 09:12:03 ALLOW  10.0.4.22 -> 91.223.10.15:443   WKSTN-FIN-03
2026-01-15 09:14:51 ALLOW  10.0.4.55 -> 8.8.8.8:53         WKSTN-FIN-11
2026-01-15 09:15:40 ALLOW  10.0.4.61 -> 172.217.10.14:443  WKSTN-HR-02`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function AlienvaultOtxPulseClient({
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
  const [t3Answer, setT3Answer] = useState("");
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
    if (checkFlag(t1Answer, "SAGE{27_1nd1c4t0rs_qu13tp4nd4}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Flag the indicator count and malware family from the pulse metadata.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "Pulse A — verified author, high subscriber corroboration, and referenced vendor writeups") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Weigh author verification, subscriber count, and references, not just recency.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (checkFlag(t3Answer, "SAGE{wkstn_f1n_03_m4tch3d_pulse_10c}")) {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Match each firewall log destination against the pulse's indicator list.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Read the Pulse" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">A colleague shares an OTX pulse that just showed up in your feed:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{PULSE_A}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Flag the total indicator count and the malware family this pulse covers.</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — 27 indicators covering the QuietPanda backdoor family. Flag: SAGE&#123;27_1nd1c4t0rs_qu13tp4nd4&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Judge Credibility" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">A second pulse on the same topic surfaces. Compare the two before deciding what to act on:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg bg-zinc-950 border border-white/8 p-4">
            <p className="text-xs text-zinc-500 mb-2">Pulse A</p>
            <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{PULSE_A}</pre>
          </div>
          <div className="rounded-lg bg-zinc-950 border border-white/8 p-4">
            <p className="text-xs text-zinc-500 mb-2">Pulse B</p>
            <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{PULSE_B}</pre>
          </div>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Which pulse should you prioritize acting on first, and why?</p>
            <div className="flex flex-col gap-2">
              {[
                "Pulse A — verified author, high subscriber corroboration, and referenced vendor writeups",
                "Pulse B — it's marked TLP:RED so it must be more sensitive and urgent",
                "Both equally — indicator count doesn't matter",
                "Pulse B — fewer indicators means a more precise, targeted pulse",
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
          <p className="text-sm font-mono text-sage-400">Correct — verification, subscriber corroboration, and references are what make a pulse actionable, not its TLP marking or indicator count alone. Flag: SAGE&#123;v3r1f13d_h1gh_c0nf1d3nc3_puls3&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Hunt Your Own Logs" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-3">You pull a subset of Pulse A's indicators and sweep your firewall logs against them:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-3">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{IOC_LIST}</pre>
        </div>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-zinc-300 whitespace-pre-wrap overflow-x-auto">{FIREWALL_LOG}</pre>
        </div>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Which host contacted a pulse indicator, and which one?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t3Answer} onChange={setT3Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t3Error && <p className="text-xs text-red-400 font-mono">{t3Error}</p>}
            <HintPanel labId={labId} stage="task_3" />
          </form>
        )}
        {done("task_3") && (
          <p className="text-sm font-mono text-sage-400">Correct — WKSTN-FIN-03 contacted 91.223.10.15, one of the pulse's flagged IPs. Flag: SAGE&#123;wkstn_f1n_03_m4tch3d_pulse_10c&#125;</p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;27_1nd1c4t0rs_qu13tp4nd4&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;v3r1f13d_h1gh_c0nf1d3nc3_puls3&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;wkstn_f1n_03_m4tch3d_pulse_10c&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
