"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";

const PSLIST_OUTPUT = [
  { pid: "4",    name: "System",        ppid: "0",   threads: "95" },
  { pid: "392",  name: "smss.exe",      ppid: "4",   threads: "2" },
  { pid: "512",  name: "csrss.exe",     ppid: "392", threads: "9" },
  { pid: "544",  name: "wininit.exe",   ppid: "392", threads: "1" },
  { pid: "604",  name: "svchost.exe",   ppid: "544", threads: "8" },
  { pid: "1337", name: "svchost32.exe", ppid: "604", threads: "3", suspicious: true },
  { pid: "2048", name: "explorer.exe",  ppid: "544", threads: "45" },
];

export function MemoryForensicsClient({
  labId,
  completedStages: initial,
}: {
  labId: string;
  completedStages: string[];
}) {
  const [completed, setCompleted] = useState<string[]>(initial);
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
      setT1Error("Incorrect. Look for an unusual process name, suspicious PID, and low thread count.");
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
          Volatility&apos;s <code className="font-mono text-amber-300">pslist</code> plugin walks the doubly-linked
          <code className="font-mono text-amber-300"> _EPROCESS</code> list to enumerate running processes.
          Malware often masquerades as a legitimate system process with a slightly modified name.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4 overflow-x-auto">
          <p className="font-mono text-xs text-zinc-500 mb-2">$ vol.py -f memory.dmp pslist</p>
          <table className="font-mono text-xs w-full">
            <thead>
              <tr className="text-zinc-500 border-b border-white/8">
                <th className="text-left pr-6 py-1">PID</th>
                <th className="text-left pr-6 py-1">Name</th>
                <th className="text-left pr-6 py-1">PPID</th>
                <th className="text-left py-1">Threads</th>
              </tr>
            </thead>
            <tbody>
              {PSLIST_OUTPUT.map((p) => (
                <tr
                  key={p.pid}
                  className={p.suspicious ? "text-red-400" : "text-amber-300"}
                >
                  <td className="pr-6 py-0.5">{p.pid}</td>
                  <td className="pr-6 py-0.5">{p.name}</td>
                  <td className="pr-6 py-0.5">{p.ppid}</td>
                  <td className="py-0.5">
                    {p.threads}
                    {p.suspicious && <span className="text-zinc-500 ml-2">← suspicious</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-zinc-500 mb-4">
          Red flags: unusual name (svchost<em>32</em>.exe), suspicious PID (1337), very few threads (3), and unexpected parent.
        </p>
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
          The <code className="font-mono text-amber-300">netscan</code> plugin lists active and recently closed
          network connections from the memory dump. C2 connections often use non-standard ports.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <p className="font-mono text-xs text-zinc-500 mb-2">$ vol.py -f memory.dmp netscan</p>
          <div className="font-mono text-xs space-y-1">
            <p className="text-zinc-500">Process             PID     Local               Remote              State</p>
            <p className="text-zinc-500">svchost.exe         604     0.0.0.0:49152       —                   LISTEN</p>
            <p className="text-red-400">svchost32.exe       1337    127.0.0.1:49823     185.220.101.47:4444  ESTABLISHED</p>
            <p className="text-zinc-500">explorer.exe        2048    10.0.0.5:49901      172.217.3.110:443   ESTABLISHED</p>
          </div>
        </div>
        <p className="text-xs text-zinc-500 mb-4">
          Port <code className="font-mono text-amber-300">4444</code> is the default Metasploit meterpreter port.
          <code className="font-mono text-amber-300"> 185.220.101.47</code> is a known Tor exit node used for C2.
        </p>
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
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{`Process: explorer.exe  PID: 2048
VAD:     0x001a0000
Protection: PAGE_EXECUTE_READWRITE
Tag: VadS

Hex:
4d 5a 90 00 03 00 00 00 04 00 00 00 ff ff 00 00  MZ..............
b8 00 00 00 00 00 00 00 40 00 00 00 00 00 00 00  ........@.......

Header: MZ  ← PE file mapped in foreign process`}</pre>
        </div>
        <p className="text-xs text-zinc-500 mb-4">
          <code className="font-mono text-amber-300">PAGE_EXECUTE_READWRITE</code> is writable AND executable — no legitimate allocation needs both.
          The <code className="font-mono text-amber-300">MZ</code> header confirms a PE image was injected and the original process hollowed out.
        </p>
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
