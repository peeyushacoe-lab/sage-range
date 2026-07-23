"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const STRINGS_OUTPUT = `$ strings suspicious.exe | grep -i -E "http|cmd|reg"
http://185.220.101.9/gate.php
cmd.exe /c reg add HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run
%APPDATA%\\svchost_update.exe
Mozilla/5.0 (compatible; MSIE 9.0)

$ file suspicious.exe
suspicious.exe: PE32 executable (GUI) Intel 80386, for MS Windows

$ md5sum suspicious.exe
9f86d081884c7d659a2feaa0c55ad015  suspicious.exe`;

const YARA_SKELETON = `rule Suspicious_C2_Beacon
{
    strings:
        $c2  = "____________________" ascii
        $per = "reg add HKCU\\\\Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Run" ascii
        $ua  = "MSIE 9.0" ascii

    condition:
        uint16(0) == 0x5A4D and 2 of them
}`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function YaraRuleBasicsClient({
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
    if (checkFlag(t1Answer, "SAGE{185_220_101_9_gate_php}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Find the C2 URL in the strings output and format it as a flag (dots and slashes → underscores).");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "0x5A4D — the 'MZ' magic bytes identifying a Windows PE file") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. This check happens at offset 0 of every file — what do all Windows executables start with?");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "MD5 is trivial to change by altering a single byte — pair YARA with behavioral rules") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Think about how easy it is for malware authors to defeat a single hash-based indicator.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Task 1 */}
      <TaskShell number={1} title="Extract the Indicator" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">
          A suspicious binary was submitted for analysis. Static analysis with <code className="text-amber-300">strings</code> and
          <code className="text-amber-300"> file</code> reveals the following:
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{STRINGS_OUTPUT}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Flag the C2 URL found in the binary (replace dots/slashes with underscores).</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — the binary calls home to 185.220.101.9/gate.php. Flag: SAGE&#123;185_220_101_9_gate_php&#125;</p>
        )}
      </TaskShell>

      {/* Task 2 */}
      <TaskShell number={2} title="Understand the File-Type Check" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">
          Here&apos;s a partial YARA rule someone is drafting to detect this malware family:
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{YARA_SKELETON}</pre>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What does <code className="text-amber-300">uint16(0) == 0x5A4D</code> check?</p>
            <div className="flex flex-col gap-2">
              {[
                "That the file is exactly 0x5A4D bytes long",
                "0x5A4D — the 'MZ' magic bytes identifying a Windows PE file",
                "That the file was compiled on Windows XP",
                "The file's MD5 checksum"
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
          <p className="text-sm font-mono text-sage-400">Correct — 0x5A4D is the little-endian encoding of "MZ", the DOS header magic bytes every Windows PE file starts with. Flag: SAGE&#123;mz_h34d3r_p3_ch3ck&#125;</p>
        )}
      </TaskShell>

      {/* Task 3 */}
      <TaskShell number={3} title="Question the Hash-Only Approach" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">
          A colleague proposes skipping the YARA rule entirely and just blocking the file&apos;s MD5 hash
          (<code className="text-amber-300">9f86d081884c7d659a2feaa0c55ad015</code>) at the endpoint.
        </p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Why is a YARA rule more resilient than hash-blocking alone?</p>
            <div className="flex flex-col gap-2">
              {[
                "Hashes are illegal to use in detection",
                "MD5 is trivial to change by altering a single byte — pair YARA with behavioral rules",
                "YARA rules run faster than hash lookups",
                "There is no real difference",
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
            Correct — a single changed byte produces a completely different hash, but YARA string/pattern rules
            still match the underlying C2 URL and persistence logic. Flag: SAGE&#123;h4sh_1s_fr4g1l3&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;185_220_101_9_gate_php&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;mz_h34d3r_p3_ch3ck&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;h4sh_1s_fr4g1l3&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
