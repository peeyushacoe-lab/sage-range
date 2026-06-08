"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";

type EventRow = {
  id: string;
  type: string;
  user: string;
  ip: string;
  count: number;
  detail: string;
  mitre: string;
};

const FAILED_LOGIN_EVENTS: EventRow[] = [
  {
    id: "4625",
    type: "Failed login",
    user: "administrator",
    ip: "10.0.0.55",
    count: 847,
    detail: "Logon Type: 3 (Network)\nFailure Reason: Unknown user name or bad password\nStatus: 0xC000006D\nSub Status: 0xC0000064\nWorkstation: ATTACKER-BOX\nLogon Process: NtLmSsp\n\nSignificance: 847 failures in 4 minutes — automated attack, not human error.",
    mitre: "T1110.001 — Brute Force: Password Guessing",
  },
  {
    id: "4625",
    type: "Failed login",
    user: "admin",
    ip: "10.0.0.55",
    count: 423,
    detail: "Logon Type: 3 (Network)\nFailure Reason: Unknown user name or bad password\nStatus: 0xC000006D\nSub Status: 0xC0000064\nWorkstation: ATTACKER-BOX\n\nSignificance: Secondary account attempt — attacker is cycling through a wordlist.",
    mitre: "T1110.001 — Brute Force: Password Guessing",
  },
  {
    id: "4625",
    type: "Failed login",
    user: "svc_backup",
    ip: "10.0.0.55",
    count: 12,
    detail: "Logon Type: 3 (Network)\nFailure Reason: Unknown user name or bad password\nStatus: 0xC000006D\nSub Status: 0xC0000064\n\nSignificance: Lower count suggests attacker slowed down or switched to targeted approach after discovering valid usernames.",
    mitre: "T1110.001 — Brute Force: Password Guessing",
  },
  {
    id: "4624",
    type: "Successful",
    user: "svc_backup",
    ip: "10.0.0.55",
    count: 1,
    detail: "Logon Type: 3 (Network)\nLogon Process: NtLmSsp\nAuthentication Package: NTLM\nImpersonation Level: Impersonation\n\nSignificance: After 12 failures, the attacker successfully authenticated as svc_backup. The brute force succeeded.",
    mitre: "T1078 — Valid Accounts",
  },
];

const SYSMON_NET = `ProcessName: C:\\Windows\\System32\\wbem\\WmiPrvSE.exe
SourceIP:    10.0.0.55    SourcePort: 49823
DestIP:      10.0.0.12    DestPort:   135
User:        DOMAIN\\svc_backup
EventTime:   2026-04-12T03:42:11Z`;

const EXFIL_LOGS = `[Sysmon Event 11 - FileCreate]
  Path:    C:\\Users\\svc_backup\\AppData\\Local\\Temp\\dump.zip
  Size:    2.3 GB
  Time:    2026-04-12T04:01:33Z

[Sysmon Event 3 - NetworkConnect]
  Process: powershell.exe
  Dest:    185.220.101.47:443
  BytesSent: 2.4 GB
  Time:    2026-04-12T04:07:52Z`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) =>
    s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function WindowsLogAnalysisClient({
  labId,
  completedStages: initial,
}: {
  labId: string;
  completedStages: string[];
}) {
  const [completed, setCompleted] = useState<string[]>(initial);
  const [expandedEvent, setExpandedEvent] = useState<number | null>(null);
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
    if (t1Choice === "Brute Force") {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Consider the pattern: hundreds of failures against multiple accounts from one source.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "WMI") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. WmiPrvSE.exe and port 135 are strong indicators of a specific protocol.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (checkFlag(t3Answer, "SAGE{185.220.101.47}")) {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Find the destination IP in the NetworkConnect event log.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Task 1 */}
      <TaskShell number={1} title="Detect Failed Logins" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">
          Windows Security event logs show a pattern of authentication activity from a single source IP.
          Click any row to inspect the full event detail — then identify the attack technique.
        </p>

        <div className="rounded-lg border border-white/8 mb-2 overflow-hidden">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-white/8 bg-zinc-900">
                <th className="px-3 py-2 text-left text-zinc-500">Event ID</th>
                <th className="px-3 py-2 text-left text-zinc-500">Type</th>
                <th className="px-3 py-2 text-left text-zinc-500">User</th>
                <th className="px-3 py-2 text-left text-zinc-500">Source IP</th>
                <th className="px-3 py-2 text-right text-zinc-500">Count</th>
              </tr>
            </thead>
            <tbody>
              {FAILED_LOGIN_EVENTS.map((ev, i) => (
                <>
                  <tr
                    key={i}
                    onClick={() => setExpandedEvent(expandedEvent === i ? null : i)}
                    className={`border-b border-white/5 cursor-pointer transition-colors ${
                      ev.id === "4624"
                        ? "bg-green-950/30 text-green-300 hover:bg-green-950/50"
                        : "text-red-300 hover:bg-red-950/20"
                    } ${expandedEvent === i ? "bg-white/5" : ""}`}
                  >
                    <td className="px-3 py-2">{ev.id}</td>
                    <td className="px-3 py-2">{ev.type}</td>
                    <td className="px-3 py-2">{ev.user}</td>
                    <td className="px-3 py-2">{ev.ip}</td>
                    <td className="px-3 py-2 text-right font-bold">
                      {ev.count}
                      <span className="ml-2 text-zinc-600">{expandedEvent === i ? "▲" : "▼"}</span>
                    </td>
                  </tr>
                  {expandedEvent === i && (
                    <tr key={`${i}-detail`} className="border-b border-white/5">
                      <td colSpan={5} className="px-4 py-3 bg-zinc-950">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Event Detail</p>
                            <pre className="text-xs text-amber-300 whitespace-pre-wrap leading-relaxed">{ev.detail}</pre>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">MITRE ATT&CK</p>
                            <span className="inline-block rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-400 font-mono">
                              {ev.mitre}
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-zinc-500 mb-4">
          Click any row to expand the full event detail. Event 4624 = successful logon. Event 4625 = failed logon.
        </p>

        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What attack technique does this pattern indicate?</p>
            <div className="flex flex-wrap gap-3">
              {["Pass-the-Hash", "Password Spraying", "Brute Force", "Kerberoasting"].map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="t1choice"
                    value={opt}
                    checked={t1Choice === opt}
                    onChange={() => setT1Choice(opt)}
                    className="accent-emerald-500"
                  />
                  <span className="text-sm font-mono text-zinc-200">{opt}</span>
                </label>
              ))}
            </div>
            <SubmitBtn label="Submit" />
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">
            Correct — 847+ failures against one account = brute force. Flag: SAGE&#123;brut3_f0rc3_d3t3ct3d&#125;
          </p>
        )}
      </TaskShell>

      {/* Task 2 */}
      <TaskShell number={2} title="Trace Lateral Movement" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">
          After gaining access, the attacker moved laterally. Sysmon Event ID 3 (network connection)
          logs reveal the protocol used.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <p className="font-mono text-xs text-zinc-500 mb-2">[Sysmon Event 3 — NetworkConnect]</p>
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{SYSMON_NET}</pre>
          <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-zinc-500 mb-1">Process</p>
              <p className="text-amber-300 font-mono">WmiPrvSE.exe = WMI Provider Host</p>
            </div>
            <div>
              <p className="text-zinc-500 mb-1">Port 135</p>
              <p className="text-amber-300 font-mono">DCOM/RPC endpoint for remote WMI</p>
            </div>
          </div>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What protocol was used for lateral movement?</p>
            <div className="flex flex-wrap gap-3">
              {["SMB", "RDP", "WMI", "SSH"].map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="t2choice"
                    value={opt}
                    checked={t2Choice === opt}
                    onChange={() => setT2Choice(opt)}
                    className="accent-emerald-500"
                  />
                  <span className="text-sm font-mono text-zinc-200">{opt}</span>
                </label>
              ))}
            </div>
            <SubmitBtn label="Submit" />
            {t2Error && <p className="text-xs text-red-400 font-mono">{t2Error}</p>}
          </form>
        )}
        {done("task_2") && (
          <p className="text-sm font-mono text-sage-400">
            Correct — WMI lateral movement via WmiPrvSE.exe on port 135. Flag: SAGE&#123;wm1_l4t3r4l_m0v3m3nt&#125;
          </p>
        )}
      </TaskShell>

      {/* Task 3 */}
      <TaskShell number={3} title="Find Data Exfiltration" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-3">
          The attacker staged and exfiltrated data. Correlate the Sysmon file creation and
          network connection events to identify the exfiltration destination.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{EXFIL_LOGS}</pre>
          <div className="mt-3 pt-3 border-t border-white/5 text-xs text-zinc-500">
            Correlation: 2.3 GB staged → 2.4 GB sent (overhead from TLS). Same session, 6-minute window.
          </div>
        </div>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What destination was used for exfiltration?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput
                value={t3Answer}
                onChange={setT3Answer}
                placeholder="SAGE{...} or IP address"
                className="flex-1"
              />
              <SubmitBtn label="Submit" />
            </div>
            {t3Error && <p className="text-xs text-red-400 font-mono">{t3Error}</p>}
          </form>
        )}
        {done("task_3") && (
          <p className="text-sm font-mono text-sage-400">
            Correct — 2.4 GB exfiltrated to the C2. Flag: SAGE&#123;185.220.101.47&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;brut3_f0rc3_d3t3ct3d&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;wm1_l4t3r4l_m0v3m3nt&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;185.220.101.47&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
