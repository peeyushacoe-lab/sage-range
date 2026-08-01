"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn, reportWrong } from "./lab-ui";
import { HintPanel } from "./hint-panel";

/**
 * PE Static Analysis — triage without execution.
 *
 * Section entropy, a near-empty import table and a suspicious overlay all
 * point the same way. The learner reaches a verdict from static evidence only,
 * which is the realistic constraint during live triage.
 */

const HASHES = `File   : invoice_scan.exe
Size   : 428,032 bytes
MD5    : 9f2a1c4e88b0d3617c5a2f9e4d1b8073
SHA256 : 4c1f9a2e7d3b5086af14c92e0b7d63581e4a9f20c8b7d34e6a1f0925c3d8b7e4
Type   : PE32 executable (GUI) Intel 80386, for MS Windows
Compiled: 2026-07-27 23:41:08 UTC
Signature: none`;

const SECTIONS = `Name      VirtSize   RawSize    Entropy   Characteristics
.text     0x00004a10 0x00004c00  6.42     CODE|EXECUTE|READ
.rdata    0x00001208 0x00001400  5.11     INITIALIZED_DATA|READ
.data     0x00000c40 0x00000200  3.88     INITIALIZED_DATA|READ|WRITE
.rsrc     0x00000ae0 0x00000c00  4.02     INITIALIZED_DATA|READ
UPX1      0x00058000 0x00057e00  7.98     CODE|EXECUTE|READ|WRITE

Overlay   : 12,288 bytes appended after last section
Overlay entropy: 7.99`;

const IMPORTS = `KERNEL32.dll
    LoadLibraryA
    GetProcAddress
    VirtualAlloc
    VirtualProtect
    ExitProcess

(5 imports total across 1 DLL)`;

const STRINGS = `Printable strings (length >= 6), deduplicated:

  UPX0
  UPX1
  UPX!
  This program cannot be run in DOS mode
  \\Microsoft\\Windows\\Maintenance\\SystemHealthCheck
  cdn-telemetry-sync.net
  /api/v2/beacon
  SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run
  schtasks.exe /create /tn
  %APPDATA%\\Roaming\\svc\\host.dat`;

function normalise(v: string): string {
  return v.trim().toLowerCase().replace(/^sage\{/, "").replace(/\}$/, "");
}

export function PeStaticAnalysisClient({
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
    const v = normalise(t1);
    if (v === "upx1" || v === "upx") {
      setE1("");
      void saveStage("task_1");
    } else {
      reportWrong(labId, "task_1");
      setE1("Which section has entropy near the theoretical maximum of 8?");
    }
  }

  function submitTwo(e: React.FormEvent) {
    e.preventDefault();
    const v = normalise(t2).replace(/\(\)$/, "");
    if (v === "getprocaddress" || v === "loadlibrarya") {
      setE2("");
      void saveStage("task_2");
    } else {
      reportWrong(labId, "task_2");
      setE2("Which import lets a packed binary resolve APIs at runtime, hiding them from the import table?");
    }
  }

  function submitThree(e: React.FormEvent) {
    e.preventDefault();
    if (normalise(t3) === "cdn-telemetry-sync.net") {
      setE3("");
      void saveStage("task_3");
    } else {
      reportWrong(labId, "task_3");
      setE3("One string is a network destination. Give the domain.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-white/10 bg-zinc-900/50 p-5">
        <p className="text-[10px] uppercase tracking-widest text-zinc-500">Brief</p>
        <p className="mt-2 text-sm text-zinc-400">
          A binary was written to a user&apos;s Temp directory by a macro. You cannot run
          it — the incident commander wants a verdict from static evidence in the next ten
          minutes.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-widest text-zinc-500">File</p>
          <pre className="overflow-x-auto rounded-lg border border-white/10 bg-zinc-900/70 p-4 font-mono text-xs text-zinc-300">
            {HASHES}
          </pre>
        </div>
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-widest text-zinc-500">Imports</p>
          <pre className="overflow-x-auto rounded-lg border border-white/10 bg-zinc-900/70 p-4 font-mono text-xs text-zinc-300">
            {IMPORTS}
          </pre>
        </div>
      </div>

      <div>
        <p className="mb-1 text-[10px] uppercase tracking-widest text-zinc-500">Sections</p>
        <pre className="overflow-x-auto rounded-lg border border-white/10 bg-zinc-900/70 p-4 font-mono text-xs text-zinc-300">
          {SECTIONS}
        </pre>
      </div>

      <div>
        <p className="mb-1 text-[10px] uppercase tracking-widest text-zinc-500">Strings</p>
        <pre className="overflow-x-auto rounded-lg border border-white/10 bg-zinc-900/70 p-4 font-mono text-xs text-zinc-300">
          {STRINGS}
        </pre>
      </div>

      <TaskShell number={1} title="Is it packed?" unlocked completed={done("task_1")}>
        <p className="mb-3 text-sm text-zinc-400">
          Compressed or encrypted data approaches maximum entropy. Name the section that
          gives the packing away.
        </p>
        {done("task_1") ? (
          <p className="text-sm text-sage-400">
            Correct — UPX1 at 7.98. Note the section is also writable and executable, which
            legitimate code sections are not.
          </p>
        ) : (
          <form onSubmit={submitOne}>
            <MonoInput value={t1} onChange={setT1} placeholder="section name" />
            {e1 && <p className="mt-2 text-xs text-red-400">{e1}</p>}
            <div className="mt-3">
              <SubmitBtn />
            </div>
          </form>
        )}
        <HintPanel labId={labId} stage="task_1" />
      </TaskShell>

      <TaskShell number={2} title="Why is the import table almost empty?" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="mb-3 text-sm text-zinc-400">
          Five imports is implausible for anything that does real work. Name the API that
          lets the unpacked payload resolve everything else at runtime.
        </p>
        {done("task_2") ? (
          <p className="text-sm text-sage-400">
            Correct. LoadLibraryA with GetProcAddress is the standard pair — the real
            import table only exists in memory after unpacking, which is exactly why static
            analysis alone cannot give you full capability.
          </p>
        ) : (
          <form onSubmit={submitTwo}>
            <MonoInput value={t2} onChange={setT2} placeholder="api name" />
            {e2 && <p className="mt-2 text-xs text-red-400">{e2}</p>}
            <div className="mt-3">
              <SubmitBtn />
            </div>
          </form>
        )}
        <HintPanel labId={labId} stage="task_2" />
      </TaskShell>

      <TaskShell number={3} title="Extract an actionable indicator" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="mb-3 text-sm text-zinc-400">
          The SOC needs something they can block right now. Give the C2 domain.
        </p>
        {done("task_3") ? (
          <p className="text-sm text-sage-400">
            Correct — cdn-telemetry-sync.net. With the scheduled-task path and Run key also
            visible, you can report packing, persistence and C2 without ever executing it.
            That is a defensible verdict in ten minutes.
          </p>
        ) : (
          <form onSubmit={submitThree}>
            <MonoInput value={t3} onChange={setT3} placeholder="domain" className="w-80 max-w-full" />
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
