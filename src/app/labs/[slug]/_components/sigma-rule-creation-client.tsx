"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const SAMPLE_LOGS = `EventID=4688 Image=C:\\Windows\\System32\\rundll32.exe CommandLine="rundll32.exe C:\\Users\\Public\\payload.dll,Entry" ParentImage=C:\\Windows\\explorer.exe
EventID=4688 Image=C:\\Windows\\System32\\notepad.exe CommandLine="notepad.exe report.txt" ParentImage=C:\\Windows\\explorer.exe
EventID=4688 Image=C:\\Windows\\System32\\rundll32.exe CommandLine="rundll32.exe shell32.dll,Control_RunDLL" ParentImage=C:\\Windows\\System32\\control.exe`;

const SIGMA_SKELETON = `title: Suspicious rundll32 Execution
logsource:
  category: process_creation
  product: windows
detection:
  selection:
    Image|endswith: '\\\\rundll32.exe'
    CommandLine|contains: '___________'
  condition: selection
level: high`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function SigmaRuleCreationClient({
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
    if (t1Choice === "process_creation") {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. These are Windows Event ID 4688 entries — what do 4688 events represent?");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (checkFlag(t2Answer, "SAGE{payload_dll_entry}")) {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Find the command line that loads a suspicious DLL from a public/writable path — quote the distinguishing substring.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "It also matches legitimate uses of rundll32 with unrelated arguments — too broad") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Think about what else could contain that substring, or what rundll32 usage looks like normally.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Task 1 */}
      <TaskShell number={1} title="Choose the Log Source" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">
          You&apos;re asked to write a Sigma rule detecting a specific Windows process-execution pattern.
          Here are the raw events you have to work with:
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{SAMPLE_LOGS}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Which Sigma logsource category applies here?</p>
            <div className="flex flex-wrap gap-3">
              {["network_connection", "process_creation", "file_event", "dns_query"].map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="t1" value={opt} checked={t1Choice === opt} onChange={() => setT1Choice(opt)} className="accent-emerald-500" />
                  <span className="text-sm font-mono text-zinc-200">{opt}</span>
                </label>
              ))}
            </div>
            <SubmitBtn label="Submit" />
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — Event ID 4688 is a new-process event, mapping to the process_creation logsource. Flag: SAGE&#123;pr0c3ss_cr34t10n_l0gs0urc3&#125;</p>
        )}
      </TaskShell>

      {/* Task 2 */}
      <TaskShell number={2} title="Find the Distinguishing Field" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">
          Two of the three events use rundll32.exe. Only one is suspicious — it loads a DLL from an
          unusual location with a generic export name.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{SIGMA_SKELETON}</pre>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What substring should fill in the CommandLine|contains field?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t2Answer} onChange={setT2Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t2Error && <p className="text-xs text-red-400 font-mono">{t2Error}</p>}
            <HintPanel labId={labId} stage="task_2" />
          </form>
        )}
        {done("task_2") && (
          <p className="text-sm font-mono text-sage-400">Correct — payload.dll,Entry is the distinguishing substring; the legitimate rundll32 calls reference known system DLLs like shell32.dll. Flag: SAGE&#123;payload_dll_entry&#125;</p>
        )}
      </TaskShell>

      {/* Task 3 */}
      <TaskShell number={3} title="Critique the Rule" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">
          A teammate suggests simplifying the rule to just <code className="text-amber-300">Image|endswith: &apos;\\rundll32.exe&apos;</code> with
          no CommandLine condition at all, to &quot;catch everything.&quot;
        </p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What&apos;s wrong with that simplification?</p>
            <div className="flex flex-col gap-2">
              {[
                "It would miss the malicious event entirely",
                "It also matches legitimate uses of rundll32 with unrelated arguments — too broad",
                "Sigma rules can't match on Image field",
                "Nothing — it's a strict improvement",
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
            Correct — rundll32.exe is used constantly for legitimate purposes (control panel applets, DLL registration, etc).
            Matching on the binary alone would flood analysts with false positives. Flag: SAGE&#123;t00_br0ad_f4ls3_p0s1t1v3s&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;pr0c3ss_cr34t10n_l0gs0urc3&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;payload_dll_entry&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;t00_br0ad_f4ls3_p0s1t1v3s&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
