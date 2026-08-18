"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn, verifyStage, useRevealedFlags } from "./lab-ui";

// Each header row — suspicious ones must be clicked/examined before answer unlocks
const EMAIL_HEADERS = [
  {
    field: "From",
    value: '"Microsoft Support" <support@micr0soft-helpdesk.net>',
    suspicious: true,
    analysis: 'Domain uses "0" instead of "o" — typosquatting. Not affiliated with Microsoft.',
  },
  {
    field: "To",
    value: "security-team@company.com",
    suspicious: false,
    analysis: "Legitimate recipient address — no anomaly.",
  },
  {
    field: "Reply-To",
    value: "exfil47@protonmail.com",
    suspicious: true,
    analysis: "Replies go to an attacker-controlled ProtonMail account, not the sender domain.",
  },
  {
    field: "Subject",
    value: "Urgent: Security Alert — Verify Your Account Now",
    suspicious: false,
    analysis: "Urgency language is common in phishing, but this alone is not a technical indicator.",
  },
  {
    field: "X-Mailer",
    value: "PhishKit v3.2",
    suspicious: true,
    analysis: 'X-Mailer "PhishKit v3.2" identifies a commercial phishing toolkit — not a real email client.',
  },
  {
    field: "Authentication-Results",
    value: "spf=fail; dkim=none; dmarc=fail",
    suspicious: true,
    analysis: "SPF failed (sender IP not authorised), no DKIM signature, DMARC failed — all three authentication checks rejected this email.",
  },
];

export function PhishingAnalysisClient({
  labId,
  completedStages: initial,
}: {
  labId: string;
  completedStages: string[];
}) {
  const [completed, setCompleted] = useState<string[]>(initial);
  const [revealed, addReveal] = useRevealedFlags(labId);
  const [examinedIds, setExaminedIds] = useState<Set<string>>(new Set());
  const [t1Choice, setT1Choice] = useState("");
  const [t1Error, setT1Error] = useState("");
  const [t2Answer, setT2Answer] = useState("");
  const [t2Error, setT2Error] = useState("");
  const [t3Choice, setT3Choice] = useState("");
  const [t3Error, setT3Error] = useState("");

  const done = (s: string) => completed.includes(s);
  const allDone = done("task_1") && done("task_2") && done("task_3");

  function markDone(stage: string, reveal?: string) {
    setCompleted((p) => (p.includes(stage) ? p : [...p, stage]));
    addReveal(stage, reveal);
  }

  async function submitT1(e: React.FormEvent) {
    e.preventDefault();
    const verdict = await verifyStage(labId, "task_1", t1Choice);
    if (verdict.correct) {
      setT1Error("");
      markDone("task_1", verdict.reveal);
    } else {
      setT1Error("Not quite. Examine all the highlighted headers — each one is a separate, distinct indicator.");
    }
  }

  async function submitT2(e: React.FormEvent) {
    e.preventDefault();
    const verdict = await verifyStage(labId, "task_2", t2Answer);
    if (verdict.correct) {
      setT2Error("");
      markDone("task_2", verdict.reveal);
    } else {
      setT2Error("Incorrect. Strip the defanging notation (hxxps, [.]) and identify the actual malicious domain.");
    }
  }

  async function submitT3(e: React.FormEvent) {
    e.preventDefault();
    const verdict = await verifyStage(labId, "task_3", t3Choice);
    if (verdict.correct) {
      setT3Error("");
      markDone("task_3", verdict.reveal);
    } else {
      setT3Error("Incorrect. Look at the reg add command — which registry key provides persistence?");
    }
  }

  return (
    <div className="space-y-6">
      {/* Task 1 — Header Forgery */}
      <TaskShell number={1} title="Header Forgery" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">
          Click each email header to examine it. Identify every suspicious indicator before the answer form unlocks.
        </p>

        <div className="rounded-lg border border-white/8 overflow-hidden mb-4">
          <p className="px-3 py-1.5 text-[10px] font-mono text-zinc-600 bg-zinc-900 border-b border-white/5 uppercase tracking-widest">
            Raw Email Headers — click each row to examine
          </p>
          {EMAIL_HEADERS.map((h) => {
            const id = h.field;
            const examined = examinedIds.has(id);
            return (
              <button
                key={id}
                onClick={() => !done("task_1") && setExaminedIds((prev) => new Set([...prev, id]))}
                className={`w-full text-left px-3 py-2 border-b border-white/5 last:border-0 transition-all ${
                  examined
                    ? h.suspicious
                      ? "bg-red-950/30"
                      : "bg-zinc-900/60"
                    : "hover:bg-white/3 cursor-pointer"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="font-mono text-xs text-zinc-500 shrink-0 w-36 pt-px">{h.field}:</span>
                  <span className={`font-mono text-xs break-all ${examined && h.suspicious ? "text-red-300" : "text-zinc-300"}`}>
                    {h.value}
                  </span>
                  {examined && h.suspicious && (
                    <span className="shrink-0 text-[9px] font-bold text-red-400 border border-red-500/40 rounded px-1 py-px ml-auto">SUSPICIOUS</span>
                  )}
                  {examined && !h.suspicious && (
                    <span className="shrink-0 text-[9px] font-bold text-zinc-500 border border-zinc-700 rounded px-1 py-px ml-auto">OK</span>
                  )}
                </div>
                {examined && (
                  <p className={`text-[10px] mt-1.5 leading-snug pl-[156px] ${h.suspicious ? "text-red-400" : "text-zinc-500"}`}>
                    {h.analysis}
                  </p>
                )}
              </button>
            );
          })}
        </div>

        {(() => {
          const suspiciousIds = EMAIL_HEADERS.filter((h) => h.suspicious).map((h) => h.field);
          const allSuspiciousExamined = suspiciousIds.every((id) => examinedIds.has(id));
          const examinedCount = examinedIds.size;
          return (
            <>
              {!allSuspiciousExamined && (
                <p className="text-xs text-zinc-600 mb-3">
                  {examinedCount === 0 ? "Click each header row to examine it." : `${examinedCount} examined — keep going, not all suspicious indicators found yet.`}
                </p>
              )}
              {allSuspiciousExamined && !done("task_1") && (
                <form onSubmit={submitT1} className="space-y-3 mt-2">
                  <p className="text-sm text-zinc-300 font-medium">All suspicious headers identified. How many distinct indicators confirm this is spoofed?</p>
                  <div className="flex flex-col gap-2">
                    {["One — the SPF fail is enough", "Two — SPF and the Reply-To mismatch", "Three — SPF fail, Reply-To mismatch, and PhishKit X-Mailer", "All of the above"].map((opt) => (
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
            </>
          );
        })()}

        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">
            Correct — all three indicators confirm spoofing. Flag: {revealed.task_1 ?? "SAGE{…}"}
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
            Correct — malicious-domain.ru is the attacker-controlled host. Flag: {revealed.task_2 ?? "SAGE{…}"}
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
            Correct — HKCU\...\Run executes payload.exe at every login. Flag: {revealed.task_3 ?? "SAGE{…}"}
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">{revealed.task_1 ?? "SAGE{…}"}</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">{revealed.task_2 ?? "SAGE{…}"}</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">{revealed.task_3 ?? "SAGE{…}"}</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
