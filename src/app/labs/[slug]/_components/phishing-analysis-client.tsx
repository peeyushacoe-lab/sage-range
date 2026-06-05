"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";

export function PhishingAnalysisClient({
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
    if (t1Choice === "All of the above") {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. All three indicators together confirm the spoofed email.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    const lower = t2Answer.toLowerCase().replace(/\s/g, "");
    if (lower.includes("malicious-domain")) {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Strip the defanging notation (hxxps, [.]) and identify the actual malicious domain.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Registry Run Key") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Look at the reg add command — which registry key provides persistence?");
    }
  }

  return (
    <div className="space-y-6">
      {/* Task 1 — Header Forgery */}
      <TaskShell number={1} title="Header Forgery" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">
          Phishing emails frequently forge the <code className="font-mono text-amber-300">From</code> header
          to impersonate trusted brands. Email authentication headers reveal the deception.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4 space-y-1">
          <p className="font-mono text-xs text-zinc-500 mb-2">Email headers:</p>
          <p className="font-mono text-xs">
            <span className="text-zinc-500">From:              </span>
            <span className="text-amber-300">&quot;Microsoft Support&quot; &lt;support@micr0soft-helpdesk.net&gt;</span>
          </p>
          <p className="font-mono text-xs">
            <span className="text-zinc-500">Reply-To:          </span>
            <span className="text-red-400">exfil47@protonmail.com</span>
          </p>
          <p className="font-mono text-xs">
            <span className="text-zinc-500">X-Mailer:          </span>
            <span className="text-red-400">PhishKit v3.2</span>
          </p>
          <p className="font-mono text-xs">
            <span className="text-zinc-500">Authentication-Results: </span>
            <span className="text-red-400">spf=fail; dkim=none</span>
          </p>
        </div>
        <p className="text-xs text-zinc-500 mb-4">
          <code className="text-amber-300 font-mono">micr0soft-helpdesk.net</code> uses a zero instead of an &apos;o&apos; — a classic typosquatting tactic.
          The mismatched Reply-To and PhishKit X-Mailer header are additional red flags.
        </p>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What authentication failure indicates this is spoofed?</p>
            <div className="flex flex-col gap-2">
              {["SPF fail", "Missing DKIM", "Suspicious Reply-To", "All of the above"].map((opt) => (
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
            Correct — all three indicators confirm spoofing. Flag: SAGE&#123;sp00f3d_3m41l_h34d3rs&#125;
          </p>
        )}
      </TaskShell>

      {/* Task 2 — URL Deobfuscation */}
      <TaskShell number={2} title="URL Deobfuscation" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">
          Phishing URLs are often &quot;defanged&quot; by security analysts to prevent accidental clicks
          (replacing <code className="font-mono text-amber-300">https</code> with <code className="font-mono text-amber-300">hxxps</code>
          and brackets around dots). The original email contained this obfuscated link:
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <p className="font-mono text-xs text-zinc-500 mb-2">Obfuscated URL from email body:</p>
          <code className="font-mono text-sm text-amber-300 break-all">
            hxxps://g00gle[.]c0m.malicious-domain[.]ru/update
          </code>
          <p className="text-xs text-zinc-500 mt-3">
            Defanging notation: <code className="font-mono text-amber-300">hxxps</code> = https,
            <code className="font-mono text-amber-300"> [.]</code> = literal dot.
            The fake Google prefix is designed to deceive at a glance.
          </p>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What is the actual malicious domain?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput
                value={t2Answer}
                onChange={setT2Answer}
                placeholder="malicious-domain.ru"
                className="flex-1"
              />
              <SubmitBtn label="Submit" />
            </div>
            {t2Error && <p className="text-xs text-red-400 font-mono">{t2Error}</p>}
          </form>
        )}
        {done("task_2") && (
          <p className="text-sm font-mono text-sage-400">
            Correct — malicious-domain.ru is the attacker-controlled host. Flag: SAGE&#123;d3obfusc4t3d_ph1sh1ng_url&#125;
          </p>
        )}
      </TaskShell>

      {/* Task 3 — Macro Behavior */}
      <TaskShell number={3} title="Macro Behavior" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-3">
          The phishing email contained a weaponized Word document. Decompiling the VBA macro
          reveals its behavior — it runs on document open and installs a persistent backdoor.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <p className="font-mono text-xs text-zinc-500 mb-2">Decompiled VBA (olevba output):</p>
          <pre className="font-mono text-xs text-cyan-300 whitespace-pre-wrap">{`Sub AutoOpen()
  Shell "cmd.exe /c powershell -enc SGVsbG8gV29ybGQ="
  Shell "cmd.exe /c reg add HKCU\\...\\Run /v Update /d C:\\temp\\payload.exe"
End Sub`}</pre>
          <p className="text-xs text-zinc-500 mt-3">
            <code className="text-amber-300 font-mono">AutoOpen()</code> executes automatically when the document is opened.
            The <code className="text-amber-300 font-mono">reg add</code> command adds a value under the Run key.
          </p>
        </div>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What persistence mechanism does this macro use?</p>
            <div className="flex flex-col gap-2">
              {["Scheduled Task", "Registry Run Key", "Startup Folder", "WMI Subscription"].map((opt) => (
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
            Correct — HKCU\...\Run executes payload.exe at every login. Flag: SAGE&#123;m4cr0_r3g1stry_p3rs1st3nc3&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;sp00f3d_3m41l_h34d3rs&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;d3obfusc4t3d_ph1sh1ng_url&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;m4cr0_r3g1stry_p3rs1st3nc3&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
