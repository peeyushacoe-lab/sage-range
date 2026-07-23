"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const PREFETCH_TABLE = `CALC.EXE-3C8I2A3F.pf       Run count: 214   Last run: 2026-03-01 09:14:02
CHROME.EXE-9B2A11F0.pf     Run count: 892   Last run: 2026-03-05 17:02:11
UPDATE_HELPER.EXE-7A1D.pf  Run count: 1     Last run: 2026-03-05 02:11:47`;

const PATH_DETAIL = `UPDATE_HELPER.EXE-7A1D.pf — referenced path:
  C:\\Users\\Public\\update_helper.exe`;

const PHISHING_ALERT = `Phishing alert timestamp: 2026-03-05 02:11:45 — attachment "invoice_update.xlsm" opened`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function PrefetchAnalysisClient({
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
    if (checkFlag(t1Answer, "SAGE{upd4t3_h3lp3r_run_c0unt_1}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Compare run counts — one entry is a clear outlier.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "It ran from C:\\Users\\Public, not a normal installation directory") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Look at where legitimate installers actually place binaries.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "The malicious attachment executed within seconds of being opened, confirming this is the entry point") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Compare the two timestamps closely.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Spot the Outlier" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">Prefetch entries pulled from a suspected compromised workstation:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{PREFETCH_TABLE}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Which executable's run count makes it stand out as suspicious?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — update_helper.exe has only ever run once, unlike the everyday tools around it. Flag: SAGE&#123;upd4t3_h3lp3r_run_c0unt_1&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Check the Execution Path" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">You pull the referenced path from that prefetch entry:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{PATH_DETAIL}</pre>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What about this path is itself suspicious?</p>
            <div className="flex flex-col gap-2">
              {[
                "It ran from C:\\Users\\Public, not a normal installation directory",
                "The filename is too short",
                "It's a .exe file, which is inherently suspicious",
                "Nothing — this is a completely normal install path",
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
          <p className="text-sm font-mono text-sage-400">Correct — a world-writable directory like C:\Users\Public is a classic drop location for malware, not a real install path. Flag: SAGE&#123;public_f0ld3r_3x3cut10n&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Correlate the Timeline" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-3">A phishing alert from the same host, around the same time:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{PHISHING_ALERT}</pre>
        </div>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What does the matching timestamp between the alert and the prefetch entry prove?</p>
            <div className="flex flex-col gap-2">
              {[
                "The malicious attachment executed within seconds of being opened, confirming this is the entry point",
                "Nothing — the timestamps are unrelated",
                "The prefetch file is corrupted",
                "The phishing email was sent after the malware already ran",
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
            Correct — the near-identical timestamps confirm the entry point: the attachment opened, then the tool executed almost immediately.
            Flag: SAGE&#123;pr3f3tch_c0nf1rms_3ntry_p01nt&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;upd4t3_h3lp3r_run_c0unt_1&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;public_f0ld3r_3x3cut10n&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;pr3f3tch_c0nf1rms_3ntry_p01nt&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
