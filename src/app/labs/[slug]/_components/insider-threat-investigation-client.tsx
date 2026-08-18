"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn, verifyStage, useRevealedFlags } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const HR_CONTEXT = `Employee: D. Voss — Senior Financial Analyst
Status: Resignation submitted 2 days ago, last day in 5 days
Access: Finance shared drive, customer contract repository, CRM export tool`;

const ACTIVITY_LOG = `[Day -2, 14:02] D. Voss logs in — normal hours, normal VPN location
[Day -1, 22:41] D. Voss logs in from home — unusual, 3 hours after normal end of shift
[Day -1, 22:44] Accessed \\\\fileserver\\Finance\\Contracts\\ — 214 files opened in 6 minutes
[Day -1, 22:52] CRM export tool used — exported "All Customers" report (12,400 records)
[Day -1, 22:58] USB mass storage device connected: SanDisk Ultra 64GB (serial SN2291X)
[Day -1, 23:04] 3.1 GB copied to USB drive (E:\\)
[Day -1, 23:11] USB device safely removed`;

const DLP_LOG = `[DLP Alert] Large file transfer to removable media — D. Voss — 3.1 GB — Contracts + CRM Export
[DLP Alert] Sensitivity label "Confidential — Customer Data" detected in transferred files
Policy match: "Bulk customer data export by departing employee" — SEVERITY: HIGH`;

export function InsiderThreatInvestigationClient({
  labId,
  completedStages: initial,
}: {
  labId: string;
  completedStages: string[];
}) {
  const [completed, setCompleted] = useState<string[]>(initial);
  const [revealed, addReveal] = useRevealedFlags(labId);
  const [t1Choice, setT1Choice] = useState("");
  const [t1Error, setT1Error] = useState("");
  const [t2Answer, setT2Answer] = useState("");
  const [t2Error, setT2Error] = useState("");
  const [t3Choice, setT3Choice] = useState("");
  const [t3Error, setT3Error] = useState("");

  const done = (s: string) => completed.includes(s);
  const allDone = done("task_1") && done("task_2") && done("task_3");

  function markDone(stage: string, reveal?: string) {
    setCompleted((p) => (p.includes(stage) ? p : [...p, stage]));
    addReveal(stage, reveal);
  }

  async function submitT1(e: React.FormEvent) {
    e.preventDefault();
    const verdict = await verifyStage(labId, "task_1", t1Choice);
    if (verdict.correct) {
      setT1Error("");
      markDone("task_1", verdict.reveal);
    } else {
      setT1Error("Incorrect. Cross-reference the HR context with the timing and volume of the activity log.");
    }
  }

  async function submitT2(e: React.FormEvent) {
    e.preventDefault();
    const verdict = await verifyStage(labId, "task_2", t2Answer);
    if (verdict.correct) {
      setT2Error("");
      markDone("task_2", verdict.reveal);
    } else {
      setT2Error("Incorrect. Combine the USB device serial number and the amount of data copied in the flag.");
    }
  }

  async function submitT3(e: React.FormEvent) {
    e.preventDefault();
    const verdict = await verifyStage(labId, "task_3", t3Choice);
    if (verdict.correct) {
      setT3Error("");
      markDone("task_3", verdict.reveal);
    } else {
      setT3Error("Incorrect. This involves both a security response and legal/HR process for a departing employee — pick the option covering both.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Task 1 */}
      <TaskShell number={1} title="Establish Context" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">A DLP alert names an employee. HR context and their recent activity log:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-3">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{HR_CONTEXT}</pre>
        </div>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{ACTIVITY_LOG}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Which combination of factors is most concerning here?</p>
            <div className="flex flex-col gap-2">
              {[
                "Normal working hours with high access levels",
                "Departing employee, off-hours access, mass file access",
                "A single failed login attempt",
                "Use of a company-issued laptop",
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
          <p className="text-sm font-mono text-sage-400">Correct — a resigning employee accessing hundreds of files off-hours is a classic pre-departure data theft pattern. Flag: {revealed.task_1 ?? "SAGE{…}"}</p>
        )}
      </TaskShell>

      {/* Task 2 */}
      <TaskShell number={2} title="Confirm the Exfiltration" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">DLP tooling corroborates what the activity log already suggests.</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{DLP_LOG}</pre>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Flag the USB device serial number and data volume together.</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t2Answer} onChange={setT2Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t2Error && <p className="text-xs text-red-400 font-mono">{t2Error}</p>}
            <HintPanel labId={labId} stage="task_2" />
          </form>
        )}
        {done("task_2") && (
          <p className="text-sm font-mono text-sage-400">Correct — SN2291X received 3.1 GB of confidential contract and customer data. Flag: {revealed.task_2 ?? "SAGE{…}"}</p>
        )}
      </TaskShell>

      {/* Task 3 */}
      <TaskShell number={3} title="Choose the Response" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">
          The employee still has 5 days of employment remaining and access to sensitive systems.
        </p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What is the correct next step?</p>
            <div className="flex flex-col gap-2">
              {[
                "Wait until their last day to raise it, to avoid confrontation",
                "Disable access immediately, preserve the USB/DLP evidence, and involve HR/Legal",
                "Send a company-wide email reminding staff about data policy",
                "Delete the exported CRM report from the server to contain it",
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
            Correct — insider cases need both immediate containment (revoke access) and a formal process (HR/Legal),
            since it may lead to termination for cause or legal action. Flag: {revealed.task_3 ?? "SAGE{…}"}
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">{revealed.task_1 ?? "SAGE{…}"}</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">{revealed.task_2 ?? "SAGE{…}"}</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">{revealed.task_3 ?? "SAGE{…}"}</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
