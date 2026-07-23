"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const DLP_ALERT = `DLP Alert — 2026-06-12 22:14
User: m.torres@corp.com
Action: Uploaded 15.2 GB across 3,400 files to personal Google Drive
Resignation announced: 2026-06-14 (2 days after this upload)`;

const ACCESS_LOG = `File access log for m.torres:
2026-06-09  Accessed \\shared\\R&D\\prototype-specs (last accessed 8 months prior)
2026-06-12  Uploaded 15.2 GB to personal cloud storage`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function InsiderDataTheftClient({
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
    if (checkFlag(t1Answer, "SAGE{15gb_p3rs0n4l_dr1v3_upl04d}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Look at the size and destination of the upload, and its timing relative to the resignation.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "The employee likely staged the data by first locating and gathering files they didn't normally need, ahead of the exfiltration") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Consider why the employee suddenly accessed a folder untouched for 8 months, right before the upload.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Immediately restrict/revoke access to sensitive systems and preserve their account and device for forensic imaging") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Think about both stopping further access and keeping evidence intact for the investigation.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Confirm the Exfiltration" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">A DLP alert fires for an employee who just announced their resignation:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{DLP_ALERT}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What single DLP alert makes this exfiltration suspicion concrete?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — a 15GB upload to personal Google Drive, 2 days before resignation, is a clear red flag. Flag: SAGE&#123;15gb_p3rs0n4l_dr1v3_upl04d&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Look for Staging Behavior" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">Access logs for this employee in the days leading up to the upload:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-red-300 whitespace-pre-wrap overflow-x-auto">{ACCESS_LOG}</pre>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What does this access pattern indicate?</p>
            <div className="flex flex-col gap-2">
              {[
                "The employee likely staged the data by first locating and gathering files they didn't normally need, ahead of the exfiltration",
                "This is completely normal behavior and unrelated to the upload",
                "The employee was performing routine file cleanup unrelated to their departure",
                "This proves the files were never actually accessed",
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
          <p className="text-sm font-mono text-sage-400">Correct — accessing an untouched folder just before the upload suggests deliberate staging of the data. Flag: SAGE&#123;st4g1ng_4cc3ss_b3f0r3_3xf1l&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Act Before the Last Day" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">The employee's last day is still a week away.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What should happen to the employee's access before their last day, given this evidence?</p>
            <div className="flex flex-col gap-2">
              {[
                "Immediately restrict/revoke access to sensitive systems and preserve their account and device for forensic imaging",
                "Wait until the last day to avoid any awkwardness",
                "Do nothing until law enforcement gets involved",
                "Delete the employee's account and device immediately to prevent further access",
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
            Correct — restrict access now and preserve the account/device for forensics rather than waiting or destroying evidence.
            Flag: SAGE&#123;r3v0k3_4cc3ss_pr3s3rv3_f0r3ns1cs&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;15gb_p3rs0n4l_dr1v3_upl04d&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;st4g1ng_4cc3ss_b3f0r3_3xf1l&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;r3v0k3_4cc3ss_pr3s3rv3_f0r3ns1cs&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
