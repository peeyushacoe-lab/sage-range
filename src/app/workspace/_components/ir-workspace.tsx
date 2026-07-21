"use client";

import { useState, useRef } from "react";

// ── Case data ──────────────────────────────────────────────────────────────────

const CASE = {
  ref:     "IR-2026-0031",
  title:   "Meridian Capital Group — Unconfirmed Breach",
  opened:  "2026-05-14 07:42 UTC",
  analyst: "You",
  brief: `SIEM automation triggered at 07:38 UTC on multiple correlated alerts.
The SOC duty manager has escalated to you for triage. No assumptions have been
made about the nature of the event. All available telemetry from 06:00–07:40 UTC
is provided across four log sources. You are responsible for scoping the incident
and producing an initial analyst report within 45 minutes.`,
};

type LogLine = { ts: string; src: string; text: string; key: string };

const LOGS: Record<string, LogLine[]> = {
  "Email Gateway": [
    { ts: "06:02", src: "gateway",       text: "Inbound: sender=hr-benefits@meridian-payroll[.]net → 14 recipients (Finance dept)", key: "eg1" },
    { ts: "06:02", src: "gateway",       text: "Subject: Q2 Pension Review — Action Required. Attachment: Q2_Pension_Summary.xlsm", key: "eg2" },
    { ts: "06:04", src: "gateway",       text: "Inbound: noreply@microsoft365update[.]com → 1 recipient (alex.brennan@meridian.com) — QUARANTINED (SPF fail)", key: "eg3" },
    { ts: "06:07", src: "gateway",       text: "Inbound: sender=hr-benefits@meridian-payroll[.]net → 3 recipients (IT dept) — identical attachment", key: "eg4" },
    { ts: "06:18", src: "gateway",       text: "Delivery confirmed: Q2_Pension_Summary.xlsm opened by j.hartley@meridian.com (Finance)", key: "eg5" },
    { ts: "06:31", src: "gateway",       text: "Delivery confirmed: Q2_Pension_Summary.xlsm opened by d.okonkwo@meridian.com (Finance)", key: "eg6" },
    { ts: "07:01", src: "gateway",       text: "Inbound: postmaster@citi-alerts[.]org → 2 recipients — bulk newsletter (low risk, pass)", key: "eg7" },
    { ts: "07:15", src: "gateway",       text: "Outbound: j.hartley@meridian.com → vendor@partnersupply.co.uk — invoice PDF (routine)", key: "eg8" },
  ],
  "EDR / Sysmon": [
    { ts: "06:19", src: "WKSTN-FIN-02",  text: "EventID 1 — EXCEL.EXE spawned cmd.exe (PID 8841, parent PID 4420)", key: "edr1" },
    { ts: "06:19", src: "WKSTN-FIN-02",  text: "EventID 1 — cmd.exe spawned powershell.exe -enc UwB0AGEAcgB0... (PID 8844)", key: "edr2" },
    { ts: "06:19", src: "WKSTN-FIN-02",  text: "EventID 3 — powershell.exe NetworkConnect → 104.21.77.83:443 (HTTPS out)", key: "edr3" },
    { ts: "06:21", src: "WKSTN-FIN-02",  text: "EventID 13 — RegistryValueSet: HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\MSUpdate → powershell.exe -w hidden -enc ...", key: "edr4" },
    { ts: "06:23", src: "WKSTN-FIN-02",  text: "EventID 10 — LSASS memory access by powershell.exe (PID 8844) — GrantedAccess 0x1410", key: "edr5" },
    { ts: "06:35", src: "WKSTN-FIN-04",  text: "EventID 3 — svchost.exe → 8.8.8.8:53 (DNS — routine Windows telemetry)", key: "edr6" },
    { ts: "06:48", src: "WKSTN-FIN-02",  text: "EventID 1 — powershell.exe spawned net.exe: net use \\\\FINANCE-SRV01\\IPC$ /u:CORP\\svc_backup [REDACTED]", key: "edr7" },
    { ts: "07:02", src: "FINANCE-SRV01", text: "EventID 1 — WmiPrvSE.exe spawned powershell.exe -enc UwB0AGEAcgB0... (PID 3121, parent WMI)", key: "edr8" },
    { ts: "07:03", src: "FINANCE-SRV01", text: "EventID 1 — powershell.exe (PID 3121) spawned robocopy.exe \\\\FINANCE-SRV01\\FinanceReports C:\\Windows\\Temp\\bk /E /Z", key: "edr9" },
    { ts: "07:05", src: "WKSTN-IT-01",   text: "EventID 3 — Chrome.exe → windowsupdate365[.]net:443 (proxy block — user browsing, low risk)", key: "edr10" },
    { ts: "07:09", src: "FINANCE-SRV01", text: "EventID 3 — powershell.exe → 104.21.77.83:443 (C2 beacon — second host now phoning home)", key: "edr11" },
    { ts: "07:22", src: "WKSTN-FIN-04",  text: "EventID 1 — cmd.exe /c ping 10.0.0.31 (IT admin routine connectivity check — known behaviour)", key: "edr12" },
    { ts: "07:38", src: "FINANCE-SRV01", text: "EventID 3 — curl.exe → 104.21.77.83:443 — 847 MB transfer OUTBOUND (DLP triggered)", key: "edr13" },
  ],
  "Auth Log": [
    { ts: "06:11", src: "DC01",          text: "4648 Explicit logon — CORP\\admin.it from 10.0.5.21 → target: FINANCE-SRV01 (IT maintenance window)", key: "al1" },
    { ts: "06:22", src: "DC01",          text: "4625 Logon failure — CORP\\j.hartley from 10.0.1.12 — Bad password (user mistyped pin)", key: "al2" },
    { ts: "06:22", src: "DC01",          text: "4624 Logon success — CORP\\j.hartley from 10.0.1.12 (WKSTN-FIN-02 → DC01, Kerberos)", key: "al3" },
    { ts: "06:49", src: "DC01",          text: "4648 Explicit logon — CORP\\svc_backup from 10.0.1.12 (WKSTN-FIN-02) → target: FINANCE-SRV01", key: "al4" },
    { ts: "06:49", src: "FINANCE-SRV01", text: "4624 Logon success — CORP\\svc_backup — LogonType 3 (Network) from 10.0.1.12", key: "al5" },
    { ts: "07:00", src: "DC01",          text: "4625 × 47 — CORP\\administrator from 185.220.101.44 — Bad password (brute force, blocked by policy)", key: "al6" },
    { ts: "07:00", src: "DC01",          text: "4740 Account lockout — CORP\\administrator (locked after 47 failures from 185.220.101.44)", key: "al7" },
    { ts: "07:04", src: "FINANCE-SRV01", text: "4648 Explicit logon — CORP\\svc_backup from 10.0.1.12 → target: FINANCE-SRV01 (second session)", key: "al8" },
  ],
  "Proxy / DLP": [
    { ts: "06:20", src: "proxy",         text: "CONNECT 104.21.77.83:443 from 10.0.1.12 — SNI: ms-update-cdn[.]net — 52 KB out (beacon pattern)", key: "pr1" },
    { ts: "06:33", src: "proxy",         text: "CONNECT teams.microsoft.com:443 from 10.0.3.7 — Teams call (routine)", key: "pr2" },
    { ts: "06:42", src: "proxy",         text: "CONNECT 104.21.77.83:443 from 10.0.1.12 — SNI: ms-update-cdn[.]net — 38 KB out (beacon #2)", key: "pr3" },
    { ts: "06:58", src: "proxy",         text: "CONNECT 104.21.77.83:443 from 10.0.0.31 — SNI: ms-update-cdn[.]net — 41 KB out (server beacon)", key: "pr4" },
    { ts: "07:10", src: "DLP",           text: "Policy match: FINANCE-SRV01 — file read \\FinanceReports\\*.xlsx — 2,847 files — 1.2 GB staged to C:\\Windows\\Temp\\bk", key: "pr5" },
    { ts: "07:21", src: "proxy",         text: "CONNECT windowsupdate.microsoft.com:443 from 10.0.5.21 — Windows Update (legitimate, IT-managed)", key: "pr6" },
    { ts: "07:38", src: "DLP",           text: "CRITICAL — Data exfiltration: 847 MB OUTBOUND to 104.21.77.83:443 from FINANCE-SRV01 — BLOCKED by policy", key: "pr7" },
    { ts: "07:39", src: "proxy",         text: "CONNECT 104.21.77.83:443 BLOCKED — policy block applied post-DLP trigger", key: "pr8" },
  ],
};

const CORRECT = {
  vector:   "spearphishing_xlsm",
  c2ip:     "104.21.77.83",
  patient0: "j.hartley",
  lateral:  "wmi",
  data:     "finance_reports",
};

// ── Component ──────────────────────────────────────────────────────────────────

export function IrWorkspace() {
  const [activeTab,  setActiveTab]  = useState<string>("Email Gateway");
  const [pinned,     setPinned]     = useState<Set<string>>(new Set());
  const [notes,      setNotes]      = useState("");
  const [phase,      setPhase]      = useState<"work" | "report" | "result">("work");

  // Report form state
  const [vector,     setVector]     = useState("");
  const [c2ip,       setC2ip]       = useState("");
  const [patient0,   setPatient0]   = useState("");
  const [lateral,    setLateral]    = useState("");
  const [data,       setData]       = useState("");
  const [summary,    setSummary]    = useState("");

  const [results,    setResults]    = useState<Record<string, boolean> | null>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  function togglePin(key: string) {
    setPinned((p) => { const n = new Set(p); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  }

  function submitReport(e: React.FormEvent) {
    e.preventDefault();
    setResults({
      vector:   vector   === CORRECT.vector,
      c2ip:     c2ip.trim().replace(/\s/g, "") === CORRECT.c2ip,
      patient0: patient0.trim().toLowerCase().includes(CORRECT.patient0),
      lateral:  lateral  === CORRECT.lateral,
      data:     data     === CORRECT.data,
    });
    setPhase("result");
  }

  const allLogs = Object.values(LOGS).flat();
  const pinnedLines = allLogs.filter((l) => pinned.has(l.key));
  const score = results ? Object.values(results).filter(Boolean).length : 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">

      {/* Case header bar */}
      <div className="border-b border-white/8 bg-zinc-900/70 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-zinc-500">{CASE.ref}</span>
          <span className="text-zinc-700">|</span>
          <span className="text-sm font-semibold text-zinc-200">{CASE.title}</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <span>Opened: {CASE.opened}</span>
          <span className="text-amber-400 font-medium animate-pulse">● ACTIVE INCIDENT</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden" style={{ minHeight: "calc(100vh - 57px)" }}>

        {/* LEFT — logs + brief */}
        <div className="flex flex-col w-full lg:w-[58%] border-r border-white/8 overflow-y-auto">

          {/* Case brief */}
          <div className="border-b border-white/8 px-5 py-4 bg-zinc-900/30">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Case Briefing</p>
            <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-line">{CASE.brief}</p>
          </div>

          {/* Log tabs */}
          <div className="border-b border-white/8 flex overflow-x-auto">
            {Object.keys(LOGS).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tab}
                <span className="ml-1.5 text-[10px] text-zinc-600">
                  ({LOGS[tab].filter(l => pinned.has(l.key)).length > 0
                    ? `${LOGS[tab].filter(l => pinned.has(l.key)).length} pinned`
                    : LOGS[tab].length})
                </span>
              </button>
            ))}
          </div>

          {/* Log lines */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-xs">
            <p className="text-[10px] text-zinc-600 mb-3 non-mono font-sans">
              Click any log line to pin it as evidence →
            </p>
            {LOGS[activeTab].map((line) => {
              const isPinned = pinned.has(line.key);
              return (
                <button
                  key={line.key}
                  onClick={() => togglePin(line.key)}
                  className={`w-full text-left rounded px-3 py-2 transition-all leading-relaxed ${
                    isPinned
                      ? "bg-emerald-500/12 border border-emerald-500/30 text-emerald-200"
                      : "hover:bg-zinc-800/60 text-zinc-300 border border-transparent"
                  }`}
                >
                  <span className="text-zinc-600 select-none mr-3">{line.ts}</span>
                  <span className="text-zinc-500 mr-3">[{line.src}]</span>
                  <span>{line.text}</span>
                  {isPinned && <span className="ml-2 text-emerald-500 text-[10px]">● pinned</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT — evidence board + notes + report */}
        <div className="hidden lg:flex flex-col w-[42%] overflow-y-auto">

          {/* Evidence board */}
          <div className="border-b border-white/8 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500">Evidence Board</p>
              <span className="text-[10px] text-zinc-600">{pinnedLines.length} item{pinnedLines.length !== 1 ? "s" : ""}</span>
            </div>
            {pinnedLines.length === 0 ? (
              <p className="text-xs text-zinc-700 italic">Click log lines on the left to pin evidence here.</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {pinnedLines.map((l) => (
                  <div key={l.key} className="flex items-start gap-2 text-xs bg-emerald-500/8 border border-emerald-500/20 rounded px-2 py-1.5">
                    <span className="text-zinc-600 shrink-0 font-mono">{l.ts}</span>
                    <span className="text-zinc-300 leading-relaxed">{l.text}</span>
                    <button onClick={() => togglePin(l.key)} className="shrink-0 text-zinc-600 hover:text-red-400 ml-auto">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Investigation notes */}
          <div className="border-b border-white/8 p-4 flex flex-col gap-2">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">Investigation Notes</p>
            <textarea
              ref={notesRef}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Type your running notes here — attack timeline, suspicious patterns, open questions…"
              className="w-full bg-zinc-900/60 border border-white/8 rounded-lg p-3 text-xs text-zinc-300 placeholder-zinc-700 resize-none focus:outline-none focus:border-emerald-500/40 h-32 font-mono leading-relaxed"
            />
          </div>

          {/* Report / results */}
          <div className="flex-1 p-4 overflow-y-auto">
            {phase === "work" && (
              <>
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3">Analyst Report</p>
                <p className="text-xs text-zinc-600 mb-4">
                  Collect evidence and review all log sources, then submit your findings below. Aim to answer every question correctly.
                </p>
                <button
                  onClick={() => setPhase("report")}
                  className="w-full rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20 transition"
                >
                  Open Report Form →
                </button>
              </>
            )}

            {phase === "report" && (
              <form onSubmit={submitReport} className="space-y-4">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Analyst Report — {CASE.ref}</p>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Initial access vector</label>
                  <select value={vector} onChange={(e) => setVector(e.target.value)} className="input-field text-xs" required>
                    <option value="">Select…</option>
                    <option value="spearphishing_xlsm">Spearphishing email with macro-enabled Excel attachment</option>
                    <option value="brute_force">Credential brute force against domain admin account</option>
                    <option value="web_exploit">Remote code execution on public-facing web server</option>
                    <option value="supply_chain">Supply chain compromise via software update</option>
                    <option value="insider">Insider threat — legitimate employee exfiltrating data</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">C2 server IP address</label>
                  <input
                    value={c2ip} onChange={(e) => setC2ip(e.target.value)}
                    placeholder="x.x.x.x" className="input-field text-xs font-mono" required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Patient zero — compromised username</label>
                  <input
                    value={patient0} onChange={(e) => setPatient0(e.target.value)}
                    placeholder="username or email" className="input-field text-xs font-mono" required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Lateral movement technique</label>
                  <select value={lateral} onChange={(e) => setLateral(e.target.value)} className="input-field text-xs" required>
                    <option value="">Select…</option>
                    <option value="psexec">PsExec (SMB remote service)</option>
                    <option value="wmi">WMI remote process creation</option>
                    <option value="rdp">RDP (Remote Desktop)</option>
                    <option value="ssh">SSH lateral movement</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Data targeted by the threat actor</label>
                  <select value={data} onChange={(e) => setData(e.target.value)} className="input-field text-xs" required>
                    <option value="">Select…</option>
                    <option value="finance_reports">Finance department reports (\\FinanceReports\\)</option>
                    <option value="hr_records">HR personnel records</option>
                    <option value="customer_pii">Customer PII database</option>
                    <option value="source_code">Source code repository</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Executive summary <span className="text-zinc-600 font-normal">(min 60 chars)</span></label>
                  <textarea
                    value={summary} onChange={(e) => setSummary(e.target.value)}
                    placeholder="Describe the attack chain, scope, and immediate recommendations…"
                    minLength={60} required
                    className="input-field text-xs h-20 resize-none font-mono leading-relaxed"
                  />
                </div>

                <div className="flex gap-2">
                  <button type="button" onClick={() => setPhase("work")}
                    className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-xs text-zinc-400 hover:border-white/20 transition">
                    ← Back to logs
                  </button>
                  <button type="submit"
                    className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition">
                    Submit Report
                  </button>
                </div>
              </form>
            )}

            {phase === "result" && results && (
              <div className="space-y-4">
                <div className={`rounded-xl border p-4 ${score === 5 ? "border-emerald-500/40 bg-emerald-500/8" : score >= 3 ? "border-amber-500/40 bg-amber-500/8" : "border-red-500/40 bg-red-500/8"}`}>
                  <p className={`font-bold text-lg ${score === 5 ? "text-emerald-400" : score >= 3 ? "text-amber-400" : "text-red-400"}`}>
                    {score}/5 correct
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {score === 5 ? "Perfect analysis — all five findings correct." : score >= 3 ? "Good work — review the missed findings below." : "Review the logs again — key clues are in the EDR and Proxy sources."}
                  </p>
                </div>

                <div className="space-y-2">
                  {[
                    { key: "vector",   label: "Initial access vector",    answer: "Spearphishing email with macro-enabled Excel attachment (Q2_Pension_Summary.xlsm)", hint: "Email gateway 06:18 shows the .xlsm opened by j.hartley. EDR 06:19 shows EXCEL.EXE spawning cmd.exe." },
                    { key: "c2ip",     label: "C2 server IP",             answer: "104.21.77.83", hint: "Proxy/EDR show repeated outbound connections to this IP via SNI ms-update-cdn[.]net, not a legitimate Microsoft address." },
                    { key: "patient0", label: "Patient zero",             answer: "j.hartley (j.hartley@meridian.com)", hint: "EDR 06:19 — WKSTN-FIN-02 is j.hartley's machine. Auth log 06:22 confirms their account logged in. Email gateway 06:18 confirms they opened the attachment." },
                    { key: "lateral",  label: "Lateral movement",         answer: "WMI remote process creation", hint: "EDR 07:02 — WmiPrvSE.exe on FINANCE-SRV01 spawned powershell.exe. WMI was used to execute the payload remotely." },
                    { key: "data",     label: "Data targeted",            answer: "Finance department reports (\\\\FinanceReports\\\\)", hint: "DLP 07:10 — 2,847 finance report files staged. Proxy 07:38 — 847 MB exfiltrated outbound to C2 before policy block." },
                  ].map(({ key, label, answer, hint }) => {
                    const correct = results[key];
                    return (
                      <div key={key} className={`rounded-lg border px-3 py-2.5 text-xs ${correct ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span>{correct ? "✓" : "✗"}</span>
                          <span className="font-medium text-zinc-300">{label}</span>
                        </div>
                        <p className="text-zinc-400">{answer}</p>
                        {!correct && <p className="text-zinc-500 mt-1 italic">{hint}</p>}
                      </div>
                    );
                  })}
                </div>

                <button onClick={() => { setPhase("work"); setResults(null); setVector(""); setC2ip(""); setPatient0(""); setLateral(""); setData(""); setSummary(""); }}
                  className="w-full rounded-lg border border-white/10 px-4 py-2 text-xs text-zinc-400 hover:border-white/20 transition">
                  Reset and try again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile-only: report panel below logs */}
      <div className="lg:hidden border-t border-white/8 p-4 space-y-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Evidence Board</p>
          {pinnedLines.length === 0 ? (
            <p className="text-xs text-zinc-700 italic">Tap log lines above to pin evidence.</p>
          ) : (
            <div className="space-y-1">
              {pinnedLines.map((l) => (
                <div key={l.key} className="text-xs bg-emerald-500/8 border border-emerald-500/20 rounded px-2 py-1.5 text-zinc-300 font-mono">
                  <span className="text-zinc-600 mr-2">{l.ts}</span>{l.text}
                </div>
              ))}
            </div>
          )}
        </div>

        {phase === "work" && (
          <button onClick={() => setPhase("report")} className="w-full rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20 transition">
            Open Report Form →
          </button>
        )}
      </div>
    </div>
  );
}
