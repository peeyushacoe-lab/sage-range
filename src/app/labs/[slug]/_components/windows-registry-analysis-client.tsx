"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const USERASSIST_KEY = `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\UserAssist
  {CEBFF5CD-ACE2-4F4F-9178-9926F41749EA}\\Count
    ROT13: RIVY_GBBYXVG.RKR       RunCount: 1   LastRun: 2026-03-11 02:14:02
    ROT13: RKCYBERE.RKR           RunCount: 340 LastRun: 2026-03-11 09:00:11
    ROT13: PZGZBA.RKR             RunCount: 2   LastRun: 2026-03-11 02:15:40

Note: UserAssist values are ROT13-encoded by Windows.`;

const SHIMCACHE = `AppCompatCache (ShimCache) entries for C:\\ around 2026-03-11 02:14:
  \\??\\C:\\Users\\Public\\evil_toolkit.exe  Modified: 2026-03-11 02:13:58
  \\??\\C:\\Windows\\System32\\ctfmon.exe    Modified: 2019-12-07 14:22:01
  \\??\\C:\\Users\\Public\\cmtmon.exe        Modified: 2026-03-11 02:15:20`;

const MRU_KEY = `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\RunMRU
  a  = "cmtmon.exe /silent\\1"
  MRUList = "a"`;

function rot13(s: string): string {
  return s.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
}

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function WindowsRegistryAnalysisClient({
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
    if (t1Answer.trim().toLowerCase().includes("evil_toolkit.exe")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Decode the ROT13 values — Windows obfuscates UserAssist entries this way by default.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "ShimCache timestamps reflect file modification time, corroborating when the binary first appeared") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. What does the ShimCache modified timestamp actually tell an investigator?");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (checkFlag(t3Answer, "SAGE{cmtm0n_s1l3nt_runmru_p3rs1st3nc3}")) {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Decode the ROT13 name from Task 1's third entry, then match it against the RunMRU key — flag the binary and the flag it ran with.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Task 1 */}
      <TaskShell number={1} title="Decode UserAssist" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">
          The UserAssist registry key tracks GUI programs a user has run — but Windows ROT13-encodes the values.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{USERASSIST_KEY}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Decode the first entry (ROT13: RIVY_GBBYXVG.RKR). What's the real filename?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="filename.exe" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
            <p className="text-[10px] text-zinc-600 font-mono">Hint: ROT13(&quot;RIVY&quot;) = {rot13("RIVY")}</p>
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — ROT13 decodes to evil_toolkit.exe, run once right before the main exploration tool. Flag: SAGE&#123;3v1l_t00lk1t_ex3&#125;</p>
        )}
      </TaskShell>

      {/* Task 2 */}
      <TaskShell number={2} title="Corroborate with ShimCache" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">
          You cross-reference against the Application Compatibility Cache (ShimCache), which tracks executables
          the OS has evaluated for compatibility — including ones that were never actually run.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{SHIMCACHE}</pre>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Why is the ShimCache modified timestamp useful here?</p>
            <div className="flex flex-col gap-2">
              {[
                "It proves the program was definitely executed",
                "ShimCache timestamps reflect file modification time, corroborating when the binary first appeared",
                "It shows the program's network activity",
                "It has no forensic value",
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
          <p className="text-sm font-mono text-sage-400">Correct — ShimCache doesn't prove execution alone, but its modified timestamp (matching UserAssist's LastRun almost exactly) strongly corroborates when the file was dropped onto disk. Flag: SAGE&#123;sh1mc4ch3_c0rr0b0r4t3s_t1m3l1n3&#125;</p>
        )}
      </TaskShell>

      {/* Task 3 */}
      <TaskShell number={3} title="Find the Persistence Trigger" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-3">
          The third UserAssist/ShimCache entry (ROT13: PGSZBA.RKR / cmtmon.exe) also appears in the Run dialog
          history (RunMRU) with a suspicious flag.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{MRU_KEY}</pre>
        </div>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Flag the binary name and the suspicious flag it was launched with.</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t3Answer} onChange={setT3Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t3Error && <p className="text-xs text-red-400 font-mono">{t3Error}</p>}
            <HintPanel labId={labId} stage="task_3" />
          </form>
        )}
        {done("task_3") && (
          <p className="text-sm font-mono text-sage-400">Correct — cmtmon.exe was launched via the Run dialog with /silent, a strong indicator of an attacker manually staging a background persistence tool. Flag: SAGE&#123;cmtm0n_s1l3nt_runmru_p3rs1st3nc3&#125;</p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;3v1l_t00lk1t_ex3&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;sh1mc4ch3_c0rr0b0r4t3s_t1m3l1n3&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;cmtm0n_s1l3nt_runmru_p3rs1st3nc3&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
