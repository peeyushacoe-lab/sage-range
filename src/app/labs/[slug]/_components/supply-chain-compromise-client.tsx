"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const DISCLOSURE = `Vendor XYZ breach disclosure (public):
"An unauthorized party gained access to our build pipeline and inserted
malicious code into update version 4.7.2. This update was digitally signed
with our legitimate certificate and distributed through our normal update
channel to all customers between March 3 and March 19."`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function SupplyChainCompromiseClient({
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
    if (checkFlag(t1Answer, "SAGE{tru5t3d_51gn3d_upd4t3_b4ckd00r}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Think about how the malicious code was actually delivered — through what trusted channel.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "Code signing proves origin/integrity from the vendor, not that the vendor's own build pipeline wasn't compromised — it's necessary but not sufficient") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Consider exactly what a valid signature actually verifies, and what it can't verify.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Identify every system that installed the compromised update version and treat all of them as potentially compromised until proven otherwise") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Think about which systems could realistically have received the bad update.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Understand the Vector" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">A vendor's public breach disclosure explains what happened:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{DISCLOSURE}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What made this attack unusually hard to detect at the time it happened?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — the malicious code arrived through a legitimately signed, trusted update, making it exceptionally hard to catch. Flag: SAGE&#123;tru5t3d_51gn3d_upd4t3_b4ckd00r&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Reassess Code Signing" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-4">A colleague says "the update was signed, so it must be safe."</p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Given that the malicious code came through a trusted, signed update, what should organizations assume about detection based on code signing alone?</p>
            <div className="flex flex-col gap-2">
              {[
                "Code signing proves origin/integrity from the vendor, not that the vendor's own build pipeline wasn't compromised — it's necessary but not sufficient",
                "Code signing is completely useless and should be ignored",
                "Signed code can never contain malware under any circumstances",
                "Only unsigned code needs any scrutiny at all",
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
          <p className="text-sm font-mono text-sage-400">Correct — signing proves the vendor's origin, not that their build pipeline itself is uncompromised. Flag: SAGE&#123;s1gn1ng_n0t_suff1c13nt_4l0n3&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Scope the Blast Radius" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">The bad update version 4.7.2 was distributed to all customers between March 3 and 19.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's the right way to scope the blast radius of this kind of compromise?</p>
            <div className="flex flex-col gap-2">
              {[
                "Identify every system that installed the compromised update version and treat all of them as potentially compromised until proven otherwise",
                "Only investigate systems that show obvious symptoms right now",
                "Assume only one system was actually affected",
                "Wait for the vendor to tell you which of your systems were hit",
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
            Correct — every system that installed the compromised version should be treated as potentially compromised until cleared.
            Flag: SAGE&#123;4ll_1nst4lls_4ss3ss3d_4s_c0mpr0m1s3d&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;tru5t3d_51gn3d_upd4t3_b4ckd00r&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;s1gn1ng_n0t_suff1c13nt_4l0n3&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;4ll_1nst4lls_4ss3ss3d_4s_c0mpr0m1s3d&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
