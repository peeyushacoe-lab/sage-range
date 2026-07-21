"use client";

import { useState } from "react";
import { HintPanel } from "./hint-panel";

const HUNT_LOGS = `2026-05-09 14:08:45  Sysmon EventID 3   it-ws-admin
  svchost.exe → 10.0.0.31:445 (SMB)
  (SCCM maintenance push — scheduled)

2026-05-09 14:11:02  Sysmon EventID 3   finance-ws01
  powershell.exe PID 5102 → 10.0.0.31:445 (SMB)
  Connection: ESTABLISHED

2026-05-09 14:11:09  Sysmon EventID 1   finance-ws01
  cmd.exe /c wmic /node:FINANCE-SERVER01 process call create "powershell -enc SQBFAFgA..."
  PID 6204, parent: powershell.exe 5102

2026-05-09 14:11:14  Sysmon EventID 1   FINANCE-SERVER01
  powershell.exe -enc SQBFAFgA... (PID 2847)
  Parent: WmiPrvSE.exe — remote WMI execution

2026-05-09 14:11:18  Sysmon EventID 1   HR-SERVER02
  msiexec.exe (PID 1204) — Parent: WmiPrvSE.exe
  CommandLine: msiexec /i security-patch-KB5034441.msi /quiet
  (SCCM-initiated software deployment — routine)

2026-05-09 14:12:01  DNS   FINANCE-SERVER01
  A? cdn.azure-update[.]net → 198.51.100.71
  (outbound resolution from server)

2026-05-09 14:13:30  DLP   FINANCE-SERVER01
  Large file read: \\\\FINANCE-SERVER01\\PatientData\\records_Q1.xlsx (42 MB)
  Actor: SYSTEM (post-exploitation)`;

export function SocTask3ThreatHunt({ labId, alreadyDone }: { labId: string; alreadyDone: boolean }) {
  const [pivotHost, setPivotHost] = useState("");
  const [lateralTool, setLateralTool] = useState("");
  const [submitted, setSubmitted] = useState(alreadyDone);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: string[] = [];
    const host = pivotHost.trim().toUpperCase().replace(/^\\\\/, "");
    const tool = lateralTool.trim().toLowerCase();

    if (host !== "FINANCE-SERVER01") errs.push("Incorrect target host. Which server spawned an encoded PowerShell process via remote execution? Cross-reference DNS and DLP events.");
    if (tool !== "wmi") errs.push("Incorrect technique. Review the command line used for remote process creation — what protocol does that tool use?");

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    setPending(true);
    try {
      await fetch("/api/labs/response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labId, stage: "task_3", response: JSON.stringify({ pivotHost, lateralTool }) }),
      });
      setSubmitted(true);
      setErrors([]);
    } finally {
      setPending(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-sage-500/30 bg-sage-500/5 p-4 text-sm">
        <p className="text-sage-500 font-medium mb-2">Threat hunt complete ✓</p>
        <p className="text-zinc-400">
          The attacker used WMI remote process creation (<code className="font-mono text-zinc-300">wmic /node: process call create</code>) to pivot from finance-ws01 to FINANCE-SERVER01. A second C2 beacon was established and 42 MB of patient records were read. The SCCM activity on HR-SERVER02 was a red herring.
        </p>
        <p className="text-zinc-500 mt-2 text-xs">Lab complete — your solve has been recorded.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm">
        <p className="text-red-400 font-medium mb-1">New SIEM escalation</p>
        <p className="text-zinc-300">Containment partially succeeded — the beacon from the initial workstation has been cut. However, fresh C2 callbacks are arriving from a second internal host. The attacker pivoted before isolation completed. Use the extended logs to identify the pivot target and technique used.</p>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wider text-zinc-600 mb-2 font-mono">Extended SIEM / Sysmon — lateral movement window</p>
        <div className="rounded border border-white/8 bg-zinc-950 p-4 overflow-x-auto max-h-60 overflow-y-auto">
          {HUNT_LOGS.split("\n").map((line, i) => (
            <p key={i} className="text-xs font-mono leading-5 whitespace-pre text-zinc-300">
              {line}
            </p>
          ))}
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-zinc-300">
            Which host did the attacker pivot to?
          </label>
          <input
            value={pivotHost}
            onChange={(e) => setPivotHost(e.target.value)}
            placeholder="hostname"
            className="input-field"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-zinc-300">
            What lateral movement technique did the attacker use?
          </label>
          <select
            value={lateralTool}
            onChange={(e) => setLateralTool(e.target.value)}
            className="input-field"
          >
            <option value="">Select technique…</option>
            <option value="psexec">PsExec (SMB + remote service)</option>
            <option value="wmi">WMI (Windows Management Instrumentation)</option>
            <option value="rdp">RDP (Remote Desktop Protocol)</option>
            <option value="dcom">DCOM (Distributed COM object)</option>
          </select>
        </div>

        {errors.length > 0 && (
          <div className="rounded border border-red-500/30 bg-red-500/5 p-3 space-y-1">
            {errors.map((e) => <p key={e} className="text-sm text-red-400">✗ {e}</p>)}
          </div>
        )}

        <HintPanel labId={labId} stage="task_3" />

        <button
          type="submit"
          disabled={pending || !pivotHost.trim() || !lateralTool}
          className="rounded bg-sage-500 px-5 py-2.5 text-sm font-medium text-black hover:bg-sage-700 hover:text-white disabled:opacity-50"
        >
          {pending ? "Submitting…" : "Submit findings"}
        </button>
      </form>
    </div>
  );
}
