"use client";

import { useState } from "react";
import { HintPanel } from "./hint-panel";

const HUNT_LOGS = `2026-05-09 14:11:02 UTC  Sysmon EventID 3  finance-ws01
  powershell.exe PID 5102 → 10.0.0.31:445 (SMB)
  Connection: ESTABLISHED

2026-05-09 14:11:09 UTC  Sysmon EventID 1  finance-ws01
  cmd.exe /c wmic /node:FINANCE-SERVER01 process call create "powershell -enc SQBFAFgA..."
  PID 6204, parent: powershell.exe 5102

2026-05-09 14:11:14 UTC  Sysmon EventID 1  FINANCE-SERVER01
  powershell.exe -enc SQBFAFgA... (PID 2847)
  Parent: WmiPrvSE.exe — remote WMI execution confirmed

2026-05-09 14:12:01 UTC  DNS  FINANCE-SERVER01
  A? cdn.ms-update[.]net → 198.51.100.42
  (new C2 beacon from second host)

2026-05-09 14:13:30 UTC  DLP  FINANCE-SERVER01
  Large file read: \\\\FINANCE-SERVER01\\PatientData\\records_Q1.xlsx (42 MB)
  Actor: SYSTEM (post-exploitation)`;

function highlight(line: string): string {
  if (line.includes("FINANCE-SERVER01")) return "text-red-400";
  if (line.includes("198.51.100.42") || line.includes("C2 beacon")) return "text-orange-400";
  if (line.includes("wmic") || line.includes("WmiPrvSE")) return "text-amber-400";
  if (line.includes("powershell") || line.includes("cmd.exe")) return "text-red-300";
  if (line.includes("DLP")) return "text-purple-400";
  return "text-zinc-400";
}

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

    if (host !== "FINANCE-SERVER01") errs.push("Pivot target host is incorrect. Trace the outbound SMB + WMI connection.");
    if (tool !== "wmi") errs.push("Lateral movement tool is incorrect. Look for the WMI-related events.");

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
      <div className="space-y-4">
        <div className="rounded-lg border border-sage-500/30 bg-sage-500/5 p-4 text-sm">
          <p className="text-sage-500 font-medium mb-2">Threat hunt complete ✓</p>
          <p className="text-zinc-400">Correct — the attacker used WMI (wmic /node: process call create) to laterally move from finance-ws01 to FINANCE-SERVER01, establishing a second C2 beacon and exfiltrating 42MB of patient records.</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          <p className="text-xs text-zinc-500 font-mono">Flag revealed</p>
          <p className="font-mono text-sage-500 mt-1">SAGE&#123;l4t3r4l_m0v3m3nt_d3t3ct3d&#125;</p>
          <p className="text-xs text-zinc-600 mt-1">Room complete. Submit this flag below for full credit.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm">
        <p className="text-red-400 font-medium mb-1">New SIEM escalation</p>
        <p className="text-zinc-300">Containment partially succeeded — the C2 beacon from finance-ws01 has been cut. However, fresh C2 callbacks are coming from a second internal host. The attacker pivoted before you could isolate. Use the extended logs below to identify the pivot target and technique.</p>
      </div>

      {/* Extended logs */}
      <div>
        <p className="text-xs uppercase tracking-wider text-zinc-600 mb-2 font-mono">Extended SIEM / Sysmon — lateral movement window</p>
        <div className="rounded border border-white/8 bg-zinc-950 p-4 overflow-x-auto max-h-56 overflow-y-auto">
          {HUNT_LOGS.split("\n").map((line, i) => (
            <p key={i} className={`text-xs font-mono leading-5 whitespace-pre ${highlight(line)}`}>
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
            placeholder="hostname or \\\\hostname"
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
            <option value="psexec">PsExec (SMB + service creation)</option>
            <option value="wmi">WMI (Windows Management Instrumentation)</option>
            <option value="rdp">RDP (Remote Desktop Protocol)</option>
            <option value="ssh">SSH (Secure Shell)</option>
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
