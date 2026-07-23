"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const IOC_FEED = `Threat Intel Bulletin — APT "SILENT MAGPIE" campaign
IOCs to hunt for across the environment:
  IP:     91.219.237.244
  Domain: update-cdn-service[.]com
  Hash:   e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b85
  Registry: HKLM\\SOFTWARE\\Classes\\CLSID\\{9BA05972-F6A8-11CF-A442-00A0C90A8F39}\\InprocServer32`;

const FLEET_SCAN = `Sweeping 340 endpoints for the above indicators...

WKSTN-HR-07   | Outbound connection to 91.219.237.244:443 — MATCH
WKSTN-HR-07   | DNS query for update-cdn-service.com — MATCH
FIN-LAPTOP-02 | No matches
WKSTN-IT-14   | Registry key HKLM\\SOFTWARE\\Classes\\CLSID\\{9BA05972-F6A8-11CF-A442-00A0C90A8F39}\\InprocServer32 modified — MATCH
DEV-BOX-33    | No matches
SRV-DC01      | No matches`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function IocHuntingClient({
  labId,
  completedStages: initial,
}: {
  labId: string;
  completedStages: string[];
}) {
  const [completed, setCompleted] = useState<string[]>(initial);
  const [t1Answer, setT1Answer] = useState("");
  const [t1Error, setT1Error] = useState("");
  const [t2Answer, setT2Answer] = useState("");
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
    if (checkFlag(t1Answer, "SAGE{2_hosts_c2_infected}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Count the endpoints that matched the network-based IOCs (IP and domain) specifically.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (checkFlag(t2Answer, "SAGE{wkstn_it_14_registry_only}")) {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. One host only matched the registry IOC, not the network ones — name it in the flag format.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Prioritize WKSTN-HR-07 — it matches multiple independent IOCs, strongest confidence") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Which host has the most independent, corroborating pieces of evidence?");
    }
  }

  return (
    <div className="space-y-6">
      {/* Task 1 */}
      <TaskShell number={1} title="Sweep the Fleet" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">
          A threat intel bulletin lands with fresh indicators for an active campaign. You run a fleet-wide sweep.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-3">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{IOC_FEED}</pre>
        </div>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{FLEET_SCAN}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">How many hosts show signs of active C2 communication (IP or domain match)?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — only WKSTN-HR-07 shows both network IOCs (IP and domain), confirming active C2 contact. Flag: SAGE&#123;2_hosts_c2_infected&#125;</p>
        )}
      </TaskShell>

      {/* Task 2 */}
      <TaskShell number={2} title="Spot the Outlier" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">
          One host matched an IOC, but not the network-based ones — worth investigating separately, since it may
          represent a different stage of infection or a false positive from an unrelated legitimate process.
        </p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Which host only matched the registry IOC?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t2Answer} onChange={setT2Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t2Error && <p className="text-xs text-red-400 font-mono">{t2Error}</p>}
            <HintPanel labId={labId} stage="task_2" />
          </form>
        )}
        {done("task_2") && (
          <p className="text-sm font-mono text-sage-400">Correct — WKSTN-IT-14 matched only the registry indicator, which alone is weaker evidence and needs corroboration before declaring a confirmed compromise. Flag: SAGE&#123;wkstn_it_14_registry_only&#125;</p>
        )}
      </TaskShell>

      {/* Task 3 */}
      <TaskShell number={3} title="Prioritize the Response" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">
          You have limited time to respond to multiple candidate hosts before end of shift. Which one goes first?
        </p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <div className="flex flex-col gap-2">
              {[
                "Prioritize DEV-BOX-33 — developers have the most access",
                "Prioritize WKSTN-HR-07 — it matches multiple independent IOCs, strongest confidence",
                "Prioritize SRV-DC01 preemptively since it's a domain controller",
                "Respond to all hosts in alphabetical order",
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
            Correct — prioritize by strength of evidence: multiple independent, corroborating IOC matches on one host
            is a far stronger signal than a role-based guess. Flag: SAGE&#123;pr10r1t1z3_by_3v1d3nc3&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;2_hosts_c2_infected&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;wkstn_it_14_registry_only&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;pr10r1t1z3_by_3v1d3nc3&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
