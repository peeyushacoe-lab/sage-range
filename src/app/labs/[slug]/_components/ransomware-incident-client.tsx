"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const PHISHING_ALERT = `Email: From "IT-Support@acmecorp-helpdesk.info" Subject "Mandatory Password Reset - Action Required"
Attachment: password_reset_form.xlsm (macro-enabled)

Endpoint EDR alert — WKSTN-ACC-09:
  03:14:02  EXCEL.EXE spawned POWERSHELL.EXE -enc <base64 blob>`;

const LATERAL_MOVEMENT = `03:16  WKSTN-ACC-09  ->  net use \\\\FS01\\C$   (admin$ share, using cached domain admin token)
03:19  FS01          ->  new scheduled task "WinUpdateCheck" created, runs encoded PowerShell
03:22  FS01          ->  4,812 files renamed with .lockbit3 extension across \\\\FS01\\Shared`;

const RANSOM_NOTE = `!!! YOUR FILES ARE ENCRYPTED !!!
All files on this network have been encrypted with military-grade encryption.
Contact us at decrypt-support@darkmail.onion within 72 hours or the price doubles.
Extension: .lockbit3`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function RansomwareIncidentClient({
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
    if (checkFlag(t1Answer, "SAGE{macr0_3n4bl3d_x1sm_ph1sh1ng}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Flag the delivery mechanism — what was the attachment and what did opening it spawn?");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "They reused a cached domain admin credential to access the file server's admin share directly") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Look at exactly what let a single workstation reach the file server's admin share.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Isolate FS01 and WKSTN-ACC-09 from the network immediately, then restore from the last known-good backup — do not pay or negotiate first") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Two hosts are actively compromised right now — think about correct ordering: contain, then recover.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Trace the Initial Access" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">3:14 AM — an EDR alert fires on a finance workstation:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{PHISHING_ALERT}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What was the initial access vector and delivery mechanism?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — a macro-enabled spreadsheet, opened from a spoofed helpdesk email, spawned encoded PowerShell the moment it was opened. Flag: SAGE&#123;macr0_3n4bl3d_x1sm_ph1sh1ng&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Follow Lateral Movement" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">Minutes later, activity spreads to the primary file server:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{LATERAL_MOVEMENT}</pre>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">How did the attacker reach the file server from a single compromised workstation?</p>
            <div className="flex flex-col gap-2">
              {[
                "They reused a cached domain admin credential to access the file server's admin share directly",
                "They exploited an unpatched vulnerability in the file server's SMB service",
                "The file server was already compromised independently",
                "They guessed the file server's local administrator password",
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
          <p className="text-sm font-mono text-sage-400">Correct — a cached domain admin token on the compromised workstation let the attacker connect straight to FS01's admin$ share, no exploit needed. Flag: SAGE&#123;c4ch3d_d0m41n_4dm1n_r3us3&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Contain and Recover" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-3">4,812 files are now encrypted, and this note has been dropped across the shared drive:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-red-400 whitespace-pre-wrap">{RANSOM_NOTE}</pre>
        </div>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What is the immediate, correct containment and recovery step?</p>
            <div className="flex flex-col gap-2">
              {[
                "Isolate FS01 and WKSTN-ACC-09 from the network immediately, then restore from the last known-good backup — do not pay or negotiate first",
                "Contact the attacker's email to negotiate a lower ransom before doing anything else",
                "Restore from backup first, then worry about isolating the hosts afterward",
                "Wait for a formal incident response retainer to be activated before touching anything",
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
            Correct — isolate both compromised hosts first so the encryption can't spread further, then recover from backup.
            Engaging the ransom note is never the first move.
            Flag: SAGE&#123;1s0l4t3_r3st0r3_d0nt_p4y_f1rst&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Incident Closed</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;macr0_3n4bl3d_x1sm_ph1sh1ng&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;c4ch3d_d0m41n_4dm1n_r3us3&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;1s0l4t3_r3st0r3_d0nt_p4y_f1rst&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
