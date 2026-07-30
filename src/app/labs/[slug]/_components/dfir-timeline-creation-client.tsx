"use client";

import { useState } from "react";
import { TaskShell, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const SOURCES = `Event Log (Security, 4624): 2026-02-03 14:02:11 — Logon Type 10 (RDP), user: svc_backup, source 203.0.113.44
MFT ($STANDARD_INFORMATION modified): 2026-02-03 14:05:02 — C:\\Windows\\Temp\\mimikatz.exe (file created)
Prefetch: MIMIKATZ.EXE run count 1, last run 2026-02-03 14:06:47`;

const MFT_TIMESTOMP = `MFT Entry for mimikatz.exe:
  $STANDARD_INFORMATION created: 2024-06-01 09:00:00
  $FILE_NAME created:            2026-02-03 14:05:02`;

export function DfirTimelineCreationClient({
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
    if (t1Choice === "The RDP logon at 14:02:11 — everything else happens after it") {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Sort all three timestamps chronologically first.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "The attacker logged in via RDP, then dropped and executed a credential-dumping tool") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Read the three merged events as one continuous sequence of actions.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "The attacker timestomped the file to backdate $STANDARD_INFORMATION and blend in with old files") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Think about why an attacker would want a dropped tool to look nearly two years old.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Build the Super-Timeline" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">Three raw artifact sources from the same compromised host:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{SOURCES}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Merged chronologically, which event happened first?</p>
            <div className="flex flex-col gap-2">
              {[
                "The RDP logon at 14:02:11 — everything else happens after it",
                "The Prefetch execution at 14:06:47 came first, the RDP logon was just noise",
                "The MFT file creation at 14:05:02 came first",
                "They all happened simultaneously so order doesn't matter",
              ].map((opt) => (
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
          <p className="text-sm font-mono text-sage-400">Correct — the 14:02:11 RDP logon precedes both the file drop and execution. Flag: SAGE&#123;rdp_l0g0n_14_02_f1rst_3v3nt&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Read the Sequence" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-4">With the timeline ordered, the three events form one continuous story.</p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What does this merged timeline prove happened?</p>
            <div className="flex flex-col gap-2">
              {[
                "The attacker logged in via RDP, then dropped and executed a credential-dumping tool",
                "A legitimate backup job ran and coincidentally overlapped with unrelated file activity",
                "The Prefetch entry is unrelated to the RDP session",
                "Nothing conclusive — three separate artifacts can't be correlated",
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
          <p className="text-sm font-mono text-sage-400">Correct — RDP logon, tool dropped to disk, tool executed minutes later. Flag: SAGE&#123;rdp_dr0p_3x3c_s3qu3nc3&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Check for Anti-Forensics" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-3">You pull the full MFT record for the dropped tool:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{MFT_TIMESTOMP}</pre>
        </div>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">The $STANDARD_INFORMATION creation date is nearly two years earlier than $FILE_NAME. What does this indicate?</p>
            <div className="flex flex-col gap-2">
              {[
                "The attacker timestomped the file to backdate $STANDARD_INFORMATION and blend in with old files",
                "The file system clock was simply wrong that day",
                "This is normal for any Windows Temp file",
                "$FILE_NAME is always inaccurate and should be ignored",
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
            Correct — a nearly two-year gap between the two timestamp attributes is a classic timestomping signature meant to make the tool look pre-existing.
            Flag: SAGE&#123;t1m3st0mp1ng_d3t3ct3d&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;rdp_l0g0n_14_02_f1rst_3v3nt&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;rdp_dr0p_3x3c_s3qu3nc3&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;t1m3st0mp1ng_d3t3ct3d&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
