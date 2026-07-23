"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const AUTH_ATTEMPTS = `[10:00:01] user=jsmith     pass=Winter2026!   FAILED
[10:00:03] user=agarcia    pass=Winter2026!   FAILED
[10:00:05] user=rwilliams  pass=Winter2026!   FAILED
[10:00:07] user=mchen      pass=Winter2026!   SUCCESS
[10:00:09] user=tanderson  pass=Winter2026!   FAILED
[10:00:11] user=kmartinez  pass=Winter2026!   FAILED
... (94 more usernames, same password, 3 total successes)`;

const LOCKOUT_POLICY = `Corp Password Policy:
  Account lockout threshold: 5 failed attempts
  Lockout observation window: 30 minutes
  Attacker's request rate: 1 attempt / 2 seconds, ONE password per user per pass`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function PasswordSprayingClient({
  labId,
  completedStages: initial,
}: {
  labId: string;
  completedStages: string[];
}) {
  const [completed, setCompleted] = useState<string[]>(initial);
  const [t1Choice, setT1Choice] = useState("");
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
    if (t1Choice === "Password spraying (one password, many usernames)") {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Look at what stays constant across attempts, and what varies.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "It stays under the per-account lockout threshold by only trying once per user") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Compare the number of attempts per individual account against the lockout threshold.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Detect by failed-login volume across many accounts sharing the same password/timing, not per-account count") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Per-account lockout thresholds are exactly what this attack is designed to slip under — think about detecting the pattern differently.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Task 1 */}
      <TaskShell number={1} title="Identify the Attack Pattern" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">Authentication logs for the corporate SSO portal show:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{AUTH_ATTEMPTS}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What technique is this?</p>
            <div className="flex flex-col gap-2">
              {[
                "Credential stuffing (many username/password pairs from a breach)",
                "Password spraying (one password, many usernames)",
                "Traditional brute force (one account, many passwords)",
                "Kerberoasting",
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
          <p className="text-sm font-mono text-sage-400">Correct — one common password (a seasonal guess) tried against 100 different usernames is password spraying. Flag: SAGE&#123;p4ssw0rd_spr4y_1d3nt1f13d&#125;</p>
        )}
      </TaskShell>

      {/* Task 2 */}
      <TaskShell number={2} title="Understand the Evasion" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">
          Despite 100 failed attempts total, no account got locked out. Here&apos;s the lockout policy.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{LOCKOUT_POLICY}</pre>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Why didn&apos;t any account lock out?</p>
            <div className="flex flex-col gap-2">
              {[
                "The lockout policy was disabled",
                "It stays under the per-account lockout threshold by only trying once per user",
                "The attacker used a VPN",
                "SSO portals cannot lock accounts",
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
          <p className="text-sm font-mono text-sage-400">Correct — with a 5-attempt threshold per account and only 1 attempt per account, the attacker stays invisible to per-account lockout controls entirely. Flag: SAGE&#123;l0ck0ut_thr3sh0ld_3v4ded&#125;</p>
        )}
      </TaskShell>

      {/* Task 3 */}
      <TaskShell number={3} title="Design the Detection" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">
          You&apos;re asked to write a detection rule for this attack pattern going forward.
        </p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What should the detection actually look for?</p>
            <div className="flex flex-col gap-2">
              {[
                "5+ failed logins on a single account within a short window",
                "Detect by failed-login volume across many accounts sharing the same password/timing, not per-account count",
                "Any login from outside the office IP range",
                "Successful logins after 5pm",
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
            Correct — spray detection needs to correlate failures ACROSS accounts within a time window, since
            per-account thresholds are exactly what this technique is built to slip under. Flag: SAGE&#123;cr0ss_4cc0unt_c0rr3l4t10n&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;p4ssw0rd_spr4y_1d3nt1f13d&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;l0ck0ut_thr3sh0ld_3v4ded&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;cr0ss_4cc0unt_c0rr3l4t10n&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
