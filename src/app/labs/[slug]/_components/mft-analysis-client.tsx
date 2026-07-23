"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const MFT_TABLE = `MFT Record #4821: notes.txt     In Use: Yes   Size: 1,204 bytes   (non-resident)
MFT Record #4822: cleanup.bat   In Use: No    Size: 312 bytes     (resident, data present)
MFT Record #4823: report.docx   In Use: Yes   Size: 88,400 bytes  (non-resident)`;

const CLEANUP_SCRIPT = `@echo off
del C:\\Windows\\Temp\\stage2.dll
del C:\\Windows\\Temp\\loader.exe
wevtutil cl Security`;

const TIMESTAMP_PAIR = `stage2.dll —
  $STANDARD_INFORMATION: created 2019-03-11 08:00:00, modified 2019-03-11 08:00:00
  $FILE_NAME:            created 2026-02-03 13:58:40, modified 2026-02-03 13:58:40`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function MftAnalysisClient({
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
    if (checkFlag(t1Answer, "SAGE{cl3anup_b4t_r3s1d3nt_r3c0v3r4bl3}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Small deleted files can have their content stored directly inside the MFT record.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "Anti-forensic cleanup — deleting the attacker's tools and clearing the Security event log") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Read exactly what the script deletes and clears.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "$FILE_NAME — it's harder for attacker tooling to modify and it matches the actual deployment window") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. One of these two attributes is far more trustworthy against timestomping.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Recover a Deleted File" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">Three MFT records from the same directory, one of them deleted:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{MFT_TABLE}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Which deleted file's contents are still fully recoverable directly from the MFT record?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — cleanup.bat is small enough to be stored resident, so its content survives deletion right inside the MFT record. Flag: SAGE&#123;cl3anup_b4t_r3s1d3nt_r3c0v3r4bl3&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Read the Recovered Script" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">Recovered resident content of cleanup.bat:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{CLEANUP_SCRIPT}</pre>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What is this script's purpose?</p>
            <div className="flex flex-col gap-2">
              {[
                "Anti-forensic cleanup — deleting the attacker's tools and clearing the Security event log",
                "A routine disk cleanup scheduled task",
                "A backup rotation script",
                "An update installer's temp-file cleanup",
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
          <p className="text-sm font-mono text-sage-400">Correct — it deletes the attacker's dropped tools and clears the Security log, textbook anti-forensic cleanup. Flag: SAGE&#123;4nt1_f0r3ns1c_cl34nup_scr1pt&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Trust the Right Timestamp" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-3">Before deletion, one of the cleaned-up files had these timestamp attributes:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{TIMESTAMP_PAIR}</pre>
        </div>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Which timestamp pair is trustworthy for establishing when this file actually arrived on disk?</p>
            <div className="flex flex-col gap-2">
              {[
                "$STANDARD_INFORMATION — it's the primary timestamp Explorer shows",
                "$FILE_NAME — it's harder for attacker tooling to modify and it matches the actual deployment window",
                "Neither — MFT timestamps can never be trusted",
                "Both are equally reliable in every case",
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
            Correct — $FILE_NAME requires kernel-level access to rewrite and lined up with the actual intrusion window here.
            Flag: SAGE&#123;f1l3_n4m3_4ttr1but3_tru5t3d&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;cl3anup_b4t_r3s1d3nt_r3c0v3r4bl3&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;4nt1_f0r3ns1c_cl34nup_scr1pt&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;f1l3_n4m3_4ttr1but3_tru5t3d&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
