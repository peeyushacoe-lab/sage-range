"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const TECHNIQUES = `PsExec:   Creates a Windows service (often named PSEXESVC), leaves Event ID 7045
WMI:      Uses the WMI management protocol — no new service, no new binary on disk
Pass-the-Hash: NTLM logon type 3 using a stolen hash, no matching Kerberos ticket request`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function LateralMovementTechniquesClient({
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
    if (checkFlag(t1Answer, "SAGE{wm1_st34lth13st_l3g1t_pr0t0c0l}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Which technique doesn't drop a new binary or service at all?");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "Service creation events (7045) showing a newly installed remote service, often named PSEXESVC") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. PsExec has to install something on the target to run remote commands.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Alert on NTLM authentication (logon type 3) for privileged accounts where no corresponding Kerberos ticket request exists") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Focus on what's true of Pass-the-Hash regardless of the delivery tool.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Compare the Techniques" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">Three common lateral movement techniques and their artifacts:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{TECHNIQUES}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Which technique leaves the least obvious footprint by using a completely legitimate management protocol?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — WMI rides a legitimate management channel, leaving the stealthiest footprint. Flag: SAGE&#123;wm1_st34lth13st_l3g1t_pr0t0c0l&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Detect PsExec" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-4">You want a detection rule specifically for PsExec-style movement.</p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's the single event log source most useful for catching this technique?</p>
            <div className="flex flex-col gap-2">
              {[
                "Service creation events (7045) showing a newly installed remote service, often named PSEXESVC",
                "DNS query logs for the target hostname",
                "Print spooler logs",
                "Windows Defender definition update logs",
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
          <p className="text-sm font-mono text-sage-400">Correct — Event ID 7045 (service creation), often named PSEXESVC, is the giveaway. Flag: SAGE&#123;s3rv1c3_cr34t10n_7045_psex3c&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Detect Pass-the-Hash" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">Pass-the-Hash can be delivered by many different tools.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's a detection strategy that catches Pass-the-Hash regardless of which tool delivered it?</p>
            <div className="flex flex-col gap-2">
              {[
                "Alert on NTLM authentication (logon type 3) for privileged accounts where no corresponding Kerberos ticket request exists",
                "Block all NTLM traffic on the network entirely",
                "Monitor only for failed logon attempts",
                "Alert whenever a user logs in outside business hours",
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
            Correct — NTLM logons for privileged accounts with no matching Kerberos request is a tool-agnostic PtH signal.
            Flag: SAGE&#123;ntlm_w1th0ut_k3rb3r0s_4l3rt&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;wm1_st34lth13st_l3g1t_pr0t0c0l&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;s3rv1c3_cr34t10n_7045_psex3c&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;ntlm_w1th0ut_k3rb3r0s_4l3rt&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
