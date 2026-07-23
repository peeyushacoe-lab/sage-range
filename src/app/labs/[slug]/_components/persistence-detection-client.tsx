"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const SCHEDULED_TASKS = `Task Name: "OneDriveStandaloneUpdater"     Trigger: At logon      Action: C:\\Windows\\Temp\\svc.exe
Task Name: "GoogleUpdateTaskMachineCore"   Trigger: Daily 03:00   Action: C:\\Program Files\\Google\\Update\\GoogleUpdate.exe
Task Name: "AdobeAAMUpdater-1.0"           Trigger: Daily 06:00   Action: C:\\Program Files (x86)\\Common Files\\Adobe\\OOBE\\PDApp\\UWA\\UpdaterStartupUtility.exe`;

const REGISTRY_RUN = `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run
  OneDrive        = "C:\\Users\\j.chen\\AppData\\Local\\Microsoft\\OneDrive\\OneDrive.exe /background"
  SecurityHealth  = "C:\\WINDOWS\\system32\\SecurityHealthSystray.exe"
  WinUpdate32     = "C:\\Users\\j.chen\\AppData\\Roaming\\svchost32.exe"`;

const SERVICE_LOG = `[Event ID 7045 — New Service Installed]
  Service Name: WindowsAuditSvc
  Image Path: C:\\Windows\\System32\\wupdmgr.exe
  Start Type: Auto
  Installed By: j.chen
  Time: 2026-06-02T02:14:09Z (outside business hours)`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function PersistenceDetectionClient({
  labId,
  completedStages: initial,
}: {
  labId: string;
  completedStages: string[];
}) {
  const [completed, setCompleted] = useState<string[]>(initial);
  const [t1Choice, setT1Choice] = useState("");
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
    if (t1Choice === "OneDriveStandaloneUpdater") {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Compare each task's action path to where the real application it's named after would actually live.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "WinUpdate32") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Two entries are legitimate signed Microsoft binaries — one has a suspicious name and an unusual install path.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (checkFlag(t3Answer, "SAGE{wupdmgr_svc_masquerade}")) {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Name the masquerading binary the malicious service points to, in the flag format.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Task 1 */}
      <TaskShell number={1} title="Audit Scheduled Tasks" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">Three scheduled tasks exist on a workstation. One doesn&apos;t point where it claims to.</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{SCHEDULED_TASKS}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Which task is suspicious?</p>
            <div className="flex flex-col gap-2">
              {["OneDriveStandaloneUpdater", "GoogleUpdateTaskMachineCore", "AdobeAAMUpdater-1.0"].map((opt) => (
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
          <p className="text-sm font-mono text-sage-400">Correct — a real OneDrive updater task would point into the OneDrive install directory, not C:\Windows\Temp\svc.exe. Flag: SAGE&#123;m4sq3r4d1ng_sch3dul3d_t4sk&#125;</p>
        )}
      </TaskShell>

      {/* Task 2 */}
      <TaskShell number={2} title="Audit the Run Key" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">
          The Run registry key for this user auto-launches three programs at login.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{REGISTRY_RUN}</pre>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Which Run key entry is suspicious?</p>
            <div className="flex flex-col gap-2">
              {["OneDrive", "SecurityHealth", "WinUpdate32"].map((opt) => (
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
          <p className="text-sm font-mono text-sage-400">Correct — svchost32.exe in Roaming AppData with a generic "WinUpdate32" name is a classic persistence disguise. Flag: SAGE&#123;run_k3y_p3rsist3nc3&#125;</p>
        )}
      </TaskShell>

      {/* Task 3 */}
      <TaskShell number={3} title="Confirm the Service Persistence" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-3">
          A new Windows service was also installed around the same time, outside business hours.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{SERVICE_LOG}</pre>
        </div>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Flag the binary this rogue service points to, and what it's masquerading as (a Windows Update tool).</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t3Answer} onChange={setT3Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t3Error && <p className="text-xs text-red-400 font-mono">{t3Error}</p>}
            <HintPanel labId={labId} stage="task_3" />
          </form>
        )}
        {done("task_3") && (
          <p className="text-sm font-mono text-sage-400">
            Correct — wupdmgr.exe mimics the legitimate Windows Update Manager name to blend in, run as a persistent
            auto-start service. Flag: SAGE&#123;wupdmgr_svc_masquerade&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;m4sq3r4d1ng_sch3dul3d_t4sk&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;run_k3y_p3rsist3nc3&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;wupdmgr_svc_masquerade&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
