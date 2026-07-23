"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const SPN_LIST = `Account       SPN                          Ticket Encryption
svc_backup    MSSQLSvc/backup01:1433       AES256
svc_sql       MSSQLSvc/sqlprod01:1433      RC4
svc_web       HTTP/webapp01                AES256`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function KerberoastingClient({
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
    if (checkFlag(t1Answer, "SAGE{svc_sql_rc4_crack4bl3}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Compare the encryption type used by each SPN account's ticket.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "Their passwords are often set once, never rotated, and rarely subject to the same complexity/expiry policy as user accounts") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Think about how service account passwords are typically managed in practice.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Use long random passwords (or managed service accounts) for SPN accounts and enforce AES-only ticket encryption") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. The fix should address both the password strength and the ticket encryption in use.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Identify the Weak Ticket" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">SPN-registered accounts and their ticket encryption types:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{SPN_LIST}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Which account's ticket is crackable offline due to weak encryption, and what type?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — svc_sql's ticket uses weak RC4 encryption, crackable offline. Flag: SAGE&#123;svc_sql_rc4_crack4bl3&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Explain the Target Choice" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-4">Kerberoasting attackers overwhelmingly target service accounts over regular users.</p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Why are service accounts especially attractive Kerberoasting targets?</p>
            <div className="flex flex-col gap-2">
              {[
                "Their passwords are often set once, never rotated, and rarely subject to the same complexity/expiry policy as user accounts",
                "Service accounts always have blank passwords by default",
                "Service accounts are never monitored by any logging system",
                "Kerberos tickets can only be requested for service accounts",
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
          <p className="text-sm font-mono text-sage-400">Correct — stale, rarely-rotated passwords make service accounts prime Kerberoasting targets. Flag: SAGE&#123;st4l3_s3rv1c3_4cc0unt_pw&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Recommend the Fix" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">Time to write up the mitigation.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's the most effective mitigation against Kerberoasting?</p>
            <div className="flex flex-col gap-2">
              {[
                "Use long random passwords (or managed service accounts) for SPN accounts and enforce AES-only ticket encryption",
                "Disable Kerberos entirely and rely only on NTLM",
                "Remove all SPNs from Active Directory",
                "Increase the domain's account lockout threshold",
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
            Correct — long random passwords (or gMSAs) plus AES-only tickets closes off Kerberoasting.
            Flag: SAGE&#123;4es_0nly_l0ng_r4nd0m_pw&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;svc_sql_rc4_crack4bl3&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;st4l3_s3rv1c3_4cc0unt_pw&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;4es_0nly_l0ng_r4nd0m_pw&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
