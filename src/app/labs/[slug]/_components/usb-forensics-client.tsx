"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const LNK_FILES = `Q4_Financials.xlsx.lnk    Target: E:\\Confidential\\Q4_Financials.xlsx   Created: 2026-06-14 18:02
Client_List.xlsx.lnk      Target: E:\\Confidential\\Client_List.xlsx    Created: 2026-06-14 18:05
vacation_photos.jpg.lnk   Target: E:\\Personal\\vacation_photos.jpg     Created: 2026-05-02 09:11`;

const CONTEXT = `Employee's last working day: 2026-06-14`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function UsbForensicsClient({
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
    if (checkFlag(t1Answer, "SAGE{2_c0nf1d3nt14l_f1l3s_jun14}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Filter the LNK files by both the drive letter and the employee's last working day.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "It shows the E: drive was used before too, but only the June 14 files matter for the exfiltration timeline") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Think about which files are actually relevant to this specific investigation.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Treat this as strong circumstantial evidence, secure it for HR/Legal, and attempt to recover the physical device if still on-site") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Think about what LNK evidence proves on its own, versus what it doesn't.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Filter the Relevant Files" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">LNK files recovered from an employee's workstation, and the case context:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-3">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{LNK_FILES}</pre>
        </div>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-zinc-300 whitespace-pre-wrap">{CONTEXT}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Which files were accessed from E: on the employee's actual last working day, and how many?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — 2 confidential files were accessed from E: on June 14, the last working day. Flag: SAGE&#123;2_c0nf1d3nt14l_f1l3s_jun14&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Filter Out the Noise" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-4">The vacation photo LNK is dated over a month earlier than the other two.</p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Why does that older LNK entry matter for this investigation?</p>
            <div className="flex flex-col gap-2">
              {[
                "It shows the E: drive was used before too, but only the June 14 files matter for the exfiltration timeline",
                "It proves the employee never used the E: drive for work files",
                "It should be treated identically to the confidential file access",
                "It invalidates the other two LNK entries entirely",
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
          <p className="text-sm font-mono text-sage-400">Correct — it's prior, unrelated device use; stay focused on the June 14 confidential file access for this timeline. Flag: SAGE&#123;f0cus_0n_r3l3v4nt_t1m3fr4m3&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Decide the Next Step" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">The physical USB device itself has not yet been recovered — you only have the LNK evidence.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's the appropriate action given LNK evidence alone?</p>
            <div className="flex flex-col gap-2">
              {[
                "Treat this as strong circumstantial evidence, secure it for HR/Legal, and attempt to recover the physical device if still on-site",
                "Discard the LNK evidence since it isn't the actual device",
                "Immediately accuse the employee publicly based on this alone",
                "Close the case — LNK files aren't valid evidence",
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
            Correct — LNK evidence is strong circumstantial support, not a smoking gun on its own; preserve it properly and try to recover the physical device.
            Flag: SAGE&#123;pr3s3rv3_4s_c1rcumst4nt14l_3v1d3nc3&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;2_c0nf1d3nt14l_f1l3s_jun14&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;f0cus_0n_r3l3v4nt_t1m3fr4m3&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;pr3s3rv3_4s_c1rcumst4nt14l_3v1d3nc3&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
