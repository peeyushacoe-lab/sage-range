"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";

type ProcessRow = {
  pid: string;
  name: string;
  ppid: string;
  threads: string;
  suspicious?: boolean;
  detail: string;
  verdict: "clean" | "suspicious" | "malicious";
};

const PSLIST_OUTPUT: ProcessRow[] = [
  { pid: "4",    name: "System",        ppid: "0",   threads: "95",  verdict: "clean",     detail: "System process. PID 4 is always System on Windows. Parent is PID 0 (Idle). Expected thread count: 60–120. Nothing suspicious here." },
  { pid: "392",  name: "smss.exe",      ppid: "4",   threads: "2",   verdict: "clean",     detail: "Session Manager Subsystem. Correct parent (System), correct thread count (2). This process initializes the Windows session." },
  { pid: "512",  name: "csrss.exe",     ppid: "392", threads: "9",   verdict: "clean",     detail: "Client/Server Runtime Subsystem. Spawned by smss.exe during session startup. Thread count of 9 is within normal range (5–15)." },
  { pid: "544",  name: "wininit.exe",   ppid: "392", threads: "1",   verdict: "clean",     detail: "Windows Initialization Process. Correct parent (smss.exe). Thread count of 1 is normal. Legitimate system process." },
  { pid: "604",  name: "svchost.exe",   ppid: "544", threads: "8",   verdict: "clean",     detail: "Service Host Process. Correct parent (wininit.exe). Hosts multiple Windows services. Thread count of 8 is normal." },
  { pid: "1337", name: "svchost32.exe", ppid: "604", threads: "3",   verdict: "malicious", detail: "⚠ SUSPICIOUS: This is NOT a legitimate Windows process. Red flags:\n• Name: 'svchost32.exe' — typosquatting on svchost.exe\n• PID 1337 — non-standard, often a joke/signature\n• Only 3 threads — legitimate svchost hosts 8–30+\n• Spawned from svchost.exe, not services.exe (wrong parent)\n\nThis is malware masquerading as a system process." },
  { pid: "2048", name: "explorer.exe",  ppid: "544", threads: "45",  verdict: "clean",     detail: "Windows Shell (File Explorer). Correct parent (wininit.exe). Thread count of 45 is normal for a user session. No anomalies." },
];

const MALFIND_OUTPUT = `Process: explorer.exe  PID: 2048
VAD:     0x001a0000
Protection: PAGE_EXECUTE_READWRITE
Tag: VadS

Hex:
4d 5a 90 00 03 00 00 00 04 00 00 00 ff ff 00 00  MZ..............
b8 00 00 00 00 00 00 00 40 00 00 00 00 00 00 00  ........@.......

Header: MZ  ← PE file mapped in foreign process`;

const VERDICT_COLORS: Record<ProcessRow["verdict"], string> = {
  clean:     "text-zinc-400",
  suspicious: "text-amber-400",
  malicious: "text-red-400",
};

export function MemoryForensicsClient({
  labId,
  completedStages: initial,
}: {
  labId: string;
  completedStages: string[];
}) {
  const [completed, setCompleted] = useState<string[]>(initial);
  const [expandedPid, setExpandedPid] = useState<string | null>(null);
  const [expandedNet, setExpandedNet] = useState(false);
  const [t1Choice, setT1Choice] = useState("");
  const [t1Error, setT1Error] = useState("");
  const [t2Answer, setT2Answer] = useState("");
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
    if (t1Choice === "svchost32.exe (fake name)") {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Click each process to inspect it — look for an unusual name and anomalous thread count.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    const lower = t2Answer.toLowerCase().replace(/\s/g, "");
    if (lower.includes("185.220.101.47") && lower.includes("4444")) {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Your answer must include both the C2 IP address and the port number.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Process Hollowing") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. The MZ header in a foreign VAD region indicates a full PE was mapped — which technique does that?");
    }
  }

  return (
    <div className="space-y-6">
      {/* Task 1 — Rogue Process */}
      <TaskShell number={1} title="Rogue Process" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">
          Volatility&apos;s <code className="font-mono text-amber-300">pslist</code> plugin enumerates running processes.
          Click any row to inspect the process and see whether it&apos;s legitimate.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 overflow-hidden mb-4">
          <p className="font-mono text-xs text-zinc-500 px-4 py-2 border-b border-white/5">$ vol.py -f memory.dmp pslist</p>
          <table className="font-mono text-xs w-full">
            <thead>
              <tr className="text-zinc-500 border-b border-white/8 bg-zinc-900/50">
                <th className="text-left px-4 py-2">PID</th>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-left px-4 py-2">PPID</th>
                <th className="text-left px-4 py-2">Threads</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {PSLIST_OUTPUT.map((p) => (
                <>
                  <tr
                    key={p.pid}
                    onClick={() => setExpandedPid(expandedPid === p.pid ? null : p.pid)}
                    className={`cursor-pointer transition-colors hover:bg-white/3 ${
                      p.verdict === "malicious" ? "bg-red-950/20" : ""
                    }`}
                  >
                    <td className={`px-4 py-2 ${VERDICT_COLORS[p.verdict]}`}>{p.pid}</td>
                    <td className={`px-4 py-2 font-semibold ${VERDICT_COLORS[p.verdict]}`}>{p.name}</td>
                    <td className={`px-4 py-2 ${VERDICT_COLORS[p.verdict]}`}>{p.ppid}</td>
                    <td className={`px-4 py-2 ${VERDICT_COLORS[p.verdict]}`}>{p.threads}</td>
                    <td className="px-4 py-2 text-right text-zinc-600 text-[10px]">
                      {expandedPid === p.pid ? "▲" : "▼"}
                    </td>
                  </tr>
                  {expandedPid === p.pid && (
                    <tr key={`${p.pid}-detail`}>
                      <td colSpan={5} className="px-4 py-3 bg-zinc-900/70 border-t border-white/5">
                        <div className="flex items-start gap-3">
                          <span className={`shrink-0 rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest mt-0.5 ${
                            p.verdict === "malicious" ? "border-red-500/40 bg-red-500/10 text-red-400" :
                            p.verdict === "suspicious" ? "border-amber-500/40 bg-amber-500/10 text-amber-400" :
                            "border-sage-500/30 bg-sage-500/10 text-sage-400"
                          }`}>
                            {p.verdict === "malicious" ? "Malicious" : p.verdict === "suspicious" ? "Suspicious" : "Clean"}
                          </span>
                          <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">{p.detail}</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Which process is suspicious and why?</p>
            <div className="flex flex-col gap-2">
              {["System (PID 4)", "svchost32.exe (fake name)", "csrss.exe (system process)", "explorer.exe"].map((opt) => (
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
            Correct — svchost32.exe is a typosquatted process name. Flag: SAGE&#123;r0gu3_pr0c3ss_d3t3ct3d&#125;
          </p>
        )}
      </TaskShell>

      {/* Task 2 — Network Connections */}
      <TaskShell number={2} title="Network Connections" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">
          The <code className="font-mono text-amber-300">netscan</code> plugin lists active network connections.
          Click the highlighted row to see full threat context.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 overflow-hidden mb-4">
          <p className="font-mono text-xs text-zinc-500 px-4 py-2 border-b border-white/5">$ vol.py -f memory.dmp netscan</p>
          <div className="divide-y divide-white/5 font-mono text-xs">
            <div className="px-4 py-2 text-zinc-500 grid grid-cols-4 gap-2">
              <span>Process</span><span>PID</span><span>Remote</span><span>State</span>
            </div>
            <div className="px-4 py-2 text-zinc-500 grid grid-cols-4 gap-2">
              <span>svchost.exe</span><span>604</span><span>—</span><span>LISTEN</span>
            </div>
            <div
              className="px-4 py-2 grid grid-cols-4 gap-2 cursor-pointer hover:bg-red-950/30 transition-colors bg-red-950/20"
              onClick={() => setExpandedNet((v) => !v)}
            >
              <span className="text-red-400 font-semibold">svchost32.exe</span>
              <span className="text-red-400">1337</span>
              <span className="text-red-400">185.220.101.47:4444</span>
              <span className="text-red-400 flex items-center gap-2">ESTABLISHED <span className="text-zinc-600">{expandedNet ? "▲" : "▼"}</span></span>
            </div>
            {expandedNet && (
              <div className="px-4 py-3 bg-zinc-900/70 border-t border-red-500/20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-zinc-500 mb-2">Connection Detail</p>
                    <div className="space-y-1">
                      <p><span className="text-zinc-600">Local: </span><span className="text-amber-300">127.0.0.1:49823</span></p>
                      <p><span className="text-zinc-600">Remote: </span><span className="text-red-400">185.220.101.47:4444</span></p>
                      <p><span className="text-zinc-600">Process: </span><span className="text-red-400">svchost32.exe (PID 1337)</span></p>
                      <p><span className="text-zinc-600">Protocol: </span><span className="text-amber-300">TCP</span></p>
                    </div>
                  </div>
                  <div>
                    <p className="text-zinc-500 mb-2">Threat Intelligence</p>
                    <div className="space-y-1">
                      <p className="text-red-400">185.220.101.47 — Known Tor exit node</p>
                      <p className="text-amber-400">Port 4444 — Default Metasploit RAT port</p>
                      <p className="text-zinc-400">This is an active C2 channel from the rogue process</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="px-4 py-2 text-zinc-500 grid grid-cols-4 gap-2">
              <span>explorer.exe</span><span>2048</span><span>172.217.3.110:443</span><span>ESTABLISHED</span>
            </div>
          </div>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What is the C2 IP:port? (e.g. 1.2.3.4:5678)</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput
                value={t2Answer}
                onChange={setT2Answer}
                placeholder="x.x.x.x:port"
                className="flex-1"
              />
              <SubmitBtn label="Submit" />
            </div>
            {t2Error && <p className="text-xs text-red-400 font-mono">{t2Error}</p>}
          </form>
        )}
        {done("task_2") && (
          <p className="text-sm font-mono text-sage-400">
            Correct — 185.220.101.47:4444 is the active C2 channel. Flag: SAGE&#123;c2_c0nn3ct10n_1d3nt1f13d&#125;
          </p>
        )}
      </TaskShell>

      {/* Task 3 — Code Injection */}
      <TaskShell number={3} title="Code Injection" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-3">
          The <code className="font-mono text-amber-300">malfind</code> plugin scans for memory regions with
          suspicious protection flags and checks for PE headers — a hallmark of code injection.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <p className="font-mono text-xs text-zinc-500 mb-2">$ vol.py -f memory.dmp malfind</p>
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{MALFIND_OUTPUT}</pre>
          <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-zinc-500 mb-1">PAGE_EXECUTE_READWRITE</p>
              <p className="text-zinc-400">Writable AND executable — no legitimate allocation needs both. Classic injection flag.</p>
            </div>
            <div>
              <p className="text-zinc-500 mb-1">MZ Header (0x4D5A)</p>
              <p className="text-zinc-400">A full PE image was mapped into explorer.exe&apos;s memory — the original code was replaced.</p>
            </div>
          </div>
        </div>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What injection technique is indicated by the MZ header in explorer.exe&apos;s VAD?</p>
            <div className="flex flex-col gap-2">
              {["DLL Injection", "Process Hollowing", "Reflective DLL", "Thread Hijacking"].map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="t3choice"
                    value={opt}
                    checked={t3Choice === opt}
                    onChange={() => setT3Choice(opt)}
                    className="accent-emerald-500"
                  />
                  <span className="text-sm font-mono text-zinc-200">{opt}</span>
                </label>
              ))}
            </div>
            <SubmitBtn label="Submit" />
            {t3Error && <p className="text-xs text-red-400 font-mono">{t3Error}</p>}
          </form>
        )}
        {done("task_3") && (
          <p className="text-sm font-mono text-sage-400">
            Correct — a full PE mapped via process hollowing leaves an MZ header in the victim&apos;s address space. Flag: SAGE&#123;pr0c3ss_h0ll0w1ng_d3t3ct3d&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;r0gu3_pr0c3ss_d3t3ct3d&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;c2_c0nn3ct10n_1d3nt1f13d&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;pr0c3ss_h0ll0w1ng_d3t3ct3d&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
