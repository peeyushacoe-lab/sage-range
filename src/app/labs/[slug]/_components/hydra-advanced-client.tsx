"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const POLICY = `Target: SSH service on 10.0.5.20
Lockout policy: 5 failed attempts locks the account for 30 minutes
Intel: org password policy requires a season + year pattern (e.g. Winter2025!)`;

const HYDRA_OUTPUT = `Hydra v9.4 (c) 2023 by van Hauser/THC
[DATA] attacking ssh://10.0.5.20:22/
[22][ssh] host: 10.0.5.20   login: jsmith   password: Summer2026!
1 of 1 target successfully completed, 1 valid password found`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function HydraAdvancedClient({
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
    if (t1Choice === "Build a small targeted wordlist matching the known pattern (e.g. Summer2026!) instead of a huge generic list that will trigger lockouts") {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Think about the lockout threshold versus the size of a generic wordlist.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (checkFlag(t2Answer, "SAGE{jsm1th_summ3r2026_val1d}")) {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Read the successful login line from the Hydra output directly.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Don't keep spraying the same account with more attempts once you have a hit — pivot to using the credential for authorized next steps") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Consider both the lockout risk and the point of the engagement.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Build a Smarter Wordlist" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">Engagement details and password policy intel:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{POLICY}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Given the lockout policy and the disclosed password pattern, what's the smarter approach vs a generic wordlist?</p>
            <div className="flex flex-col gap-2">
              {[
                "Build a small targeted wordlist matching the known pattern (e.g. Summer2026!) instead of a huge generic list that will trigger lockouts",
                "Use rockyou.txt as-is since bigger wordlists always find more passwords",
                "Increase the number of parallel threads to brute-force faster before lockout kicks in",
                "Ignore the lockout policy entirely and retry immediately after each lockout",
              ].map((opt) => (
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
          <p className="text-sm font-mono text-sage-400">Correct — a targeted wordlist matching the known pattern avoids tripping the lockout threshold. Flag: SAGE&#123;t4rg3t3d_w0rdl1st_4v01ds_l0ck0ut&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Read the Result" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">Hydra output after running the targeted wordlist:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-emerald-300 whitespace-pre-wrap overflow-x-auto">{HYDRA_OUTPUT}</pre>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What username/password combination was found valid?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t2Answer} onChange={setT2Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t2Error && <p className="text-xs text-red-400 font-mono">{t2Error}</p>}
            <HintPanel labId={labId} stage="task_2" />
          </form>
        )}
        {done("task_2") && (
          <p className="text-sm font-mono text-sage-400">Correct — jsmith / Summer2026! is the valid credential pair. Flag: SAGE&#123;jsm1th_summ3r2026_val1d&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Know When to Stop" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">You now have one working credential.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What should you NOT do next?</p>
            <div className="flex flex-col gap-2">
              {[
                "Don't keep spraying the same account with more attempts once you have a hit — pivot to using the credential for authorized next steps",
                "Immediately report the finding without verifying it works",
                "Delete the Hydra logs to hide your activity",
                "Try the same password against every other account in the domain",
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
            Correct — stop spraying that account once you have a hit; use the credential for the authorized next step instead.
            Flag: SAGE&#123;st0p_spr4y1ng_4ft3r_h1t&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;t4rg3t3d_w0rdl1st_4v01ds_l0ck0ut&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;jsm1th_summ3r2026_val1d&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;st0p_spr4y1ng_4ft3r_h1t&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
