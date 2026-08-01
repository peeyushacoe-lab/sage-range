"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn, reportWrong } from "./lab-ui";
import { HintPanel } from "./hint-panel";

/**
 * Memory Process Hunt.
 *
 * Process-injection triage from a memory image. The planted anomalies are the
 * ones that survive real-world obfuscation: an impossible parent, a masqueraded
 * path, and RWX private memory in a process that should have none.
 */

const PSTREE = `Volatility 3 — windows.pstree

PID    PPID   ImageFileName      Offset(V)          Threads  Handles
4      0      System             0xa48c0b25d040     142      -
 380   4      smss.exe           0xa48c0d1a3080     2        -
  512  380    csrss.exe          0xa48c0e447080     11       -
  588  380    wininit.exe        0xa48c0e9c2080     1        -
   704 588    services.exe       0xa48c0f118080     8        -
    812 704   svchost.exe        0xa48c0f4d1080     22       -
    904 704   svchost.exe        0xa48c0f6a2080     14       -
   1120 588   lsass.exe          0xa48c0fb31080     9        -
  620  380    winlogon.exe       0xa48c0ea11080     4        -
   1408 620   explorer.exe       0xa48c11c02080     48       -
    2104 1408 chrome.exe         0xa48c1330a080     31       -
    2288 1408 OUTLOOK.EXE        0xa48c14b18080     26       -
     3012 2288 WINWORD.EXE       0xa48c15d21080     12       -
      3140 3012 powershell.exe   0xa48c1622f080     9        -
       3288 3140 svchost.exe     0xa48c1701b080     6        -
    2440 1408 svchost.exe        0xa48c13f04080     5        -`;

const DLLLIST = `windows.dlllist --pid 3288

Base               Size     Path
0x7ff6a1200000     0x18000  C:\\Users\\a.patel\\AppData\\Local\\Temp\\svchost.exe
0x7ffb2c110000    0x1f2000  C:\\Windows\\System32\\ntdll.dll
0x7ffb2a340000    0x0bc000  C:\\Windows\\System32\\kernel32.dll
0x7ffb29d10000    0x2a4000  C:\\Windows\\System32\\KERNELBASE.dll
0x7ffb2b8f0000    0x09e000  C:\\Windows\\System32\\ws2_32.dll

windows.dlllist --pid 2440

Base               Size     Path
0x7ff7d4a10000     0x4c000  C:\\Windows\\System32\\svchost.exe
0x7ffb2c110000    0x1f2000  C:\\Windows\\System32\\ntdll.dll
0x7ffb2a340000    0x0bc000  C:\\Windows\\System32\\kernel32.dll`;

const MALFIND = `windows.malfind

PID   Process        Start              End                Protection        Notes
2104  chrome.exe     0x1f4a20000        0x1f4a30000        PAGE_EXECUTE_READ  JIT region, backed
1120  lsass.exe      0x1d8c40000        0x1d8c58000        PAGE_EXECUTE_READWRITE  private, unbacked
3288  svchost.exe    0x2a1b00000        0x2a1b20000        PAGE_EXECUTE_READWRITE  private, unbacked

Hexdump — PID 1120 @ 0x1d8c40000
4d 5a 90 00 03 00 00 00  04 00 00 00 ff ff 00 00   MZ..............
b8 00 00 00 00 00 00 00  40 00 00 00 00 00 00 00   ........@.......`;

function normalise(v: string): string {
  return v.trim().toLowerCase().replace(/^sage\{/, "").replace(/\}$/, "");
}

export function MemoryProcessHuntClient({
  labId,
  completedStages: initial,
}: {
  labId: string;
  completedStages: string[];
}) {
  const [completed, setCompleted] = useState<string[]>(initial);
  const [t1, setT1] = useState("");
  const [e1, setE1] = useState("");
  const [t2, setT2] = useState("");
  const [e2, setE2] = useState("");
  const [t3, setT3] = useState("");
  const [e3, setE3] = useState("");

  const done = (s: string) => completed.includes(s);

  async function saveStage(stage: string) {
    await fetch("/api/labs/response", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labId, stage, response: "correct" }),
    });
    setCompleted((p) => [...p, stage]);
  }

  function submitOne(e: React.FormEvent) {
    e.preventDefault();
    if (normalise(t1) === "3288") {
      setE1("");
      void saveStage("task_1");
    } else {
      reportWrong(labId, "task_1");
      setE1("svchost.exe should descend from services.exe. One does not. Give its PID.");
    }
  }

  function submitTwo(e: React.FormEvent) {
    e.preventDefault();
    const v = normalise(t2).replace(/\\/g, "\\");
    if (v.includes("temp") && v.includes("svchost.exe")) {
      setE2("");
      void saveStage("task_2");
    } else {
      reportWrong(labId, "task_2");
      setE2("Compare the image paths of PID 3288 and PID 2440. Give the anomalous full path.");
    }
  }

  function submitThree(e: React.FormEvent) {
    e.preventDefault();
    if (normalise(t3) === "1120" || normalise(t3) === "lsass.exe") {
      setE3("");
      void saveStage("task_3");
    } else {
      reportWrong(labId, "task_3");
      setE3("Which process has unbacked RWX memory beginning with an MZ header?");
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-white/10 bg-zinc-900/50 p-5">
        <p className="text-[10px] uppercase tracking-widest text-zinc-500">Brief</p>
        <p className="mt-2 text-sm text-zinc-400">
          A memory image was captured from a finance workstation after EDR flagged
          something it could not classify. Three anomalies are present. The process tree is
          where you start.
        </p>
      </div>

      <div>
        <p className="mb-1 text-[10px] uppercase tracking-widest text-zinc-500">Process tree</p>
        <pre className="overflow-x-auto rounded-lg border border-white/10 bg-zinc-900/70 p-4 font-mono text-xs leading-relaxed text-zinc-300">
          {PSTREE}
        </pre>
      </div>

      <div>
        <p className="mb-1 text-[10px] uppercase tracking-widest text-zinc-500">Loaded modules</p>
        <pre className="overflow-x-auto rounded-lg border border-white/10 bg-zinc-900/70 p-4 font-mono text-xs leading-relaxed text-zinc-300">
          {DLLLIST}
        </pre>
      </div>

      <div>
        <p className="mb-1 text-[10px] uppercase tracking-widest text-zinc-500">malfind</p>
        <pre className="overflow-x-auto rounded-lg border border-white/10 bg-zinc-900/70 p-4 font-mono text-xs leading-relaxed text-zinc-300">
          {MALFIND}
        </pre>
      </div>

      <TaskShell number={1} title="The impossible parent" unlocked completed={done("task_1")}>
        <p className="mb-3 text-sm text-zinc-400">
          On a healthy Windows host, svchost.exe is started by services.exe. One instance
          here has a very different ancestry. Give its PID.
        </p>
        {done("task_1") ? (
          <p className="text-sm text-sage-400">
            Correct — PID 3288, descended from Outlook → Word → PowerShell. That chain is
            the whole intrusion in one line.
          </p>
        ) : (
          <form onSubmit={submitOne}>
            <MonoInput value={t1} onChange={setT1} placeholder="pid" />
            {e1 && <p className="mt-2 text-xs text-red-400">{e1}</p>}
            <div className="mt-3">
              <SubmitBtn />
            </div>
          </form>
        )}
        <HintPanel labId={labId} stage="task_1" />
      </TaskShell>

      <TaskShell number={2} title="Masquerading" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="mb-3 text-sm text-zinc-400">
          It borrowed a trusted name but not the trusted location. Give the full image path
          it actually ran from.
        </p>
        {done("task_2") ? (
          <p className="text-sm text-sage-400">
            Correct — running from AppData\Local\Temp, while the genuine PID 2440 runs from
            System32. Name alone is never identity.
          </p>
        ) : (
          <form onSubmit={submitTwo}>
            <MonoInput value={t2} onChange={setT2} placeholder="full path" className="w-full max-w-xl" />
            {e2 && <p className="mt-2 text-xs text-red-400">{e2}</p>}
            <div className="mt-3">
              <SubmitBtn />
            </div>
          </form>
        )}
        <HintPanel labId={labId} stage="task_2" />
      </TaskShell>

      <TaskShell number={3} title="Injected code" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="mb-3 text-sm text-zinc-400">
          malfind reports three regions. One is a legitimate JIT allocation. Of the
          remaining two, which process being injected should worry you most? Give its PID.
        </p>
        {done("task_3") ? (
          <p className="text-sm text-sage-400">
            Correct — PID 1120, lsass.exe, holding an unbacked RWX region that starts with
            an MZ header: a full PE mapped into the process that holds credentials. Treat
            every credential on this host as compromised.
          </p>
        ) : (
          <form onSubmit={submitThree}>
            <MonoInput value={t3} onChange={setT3} placeholder="pid" />
            {e3 && <p className="mt-2 text-xs text-red-400">{e3}</p>}
            <div className="mt-3">
              <SubmitBtn />
            </div>
          </form>
        )}
        <HintPanel labId={labId} stage="task_3" />
      </TaskShell>
    </div>
  );
}
