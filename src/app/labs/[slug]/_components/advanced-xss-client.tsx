"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const FILTER_CODE = `// Server-side "sanitization"
function sanitize(input) {
  return input.replace(/<script.*?>.*?<\\/script>/gi, "");
}
// Comment field accepts this without being stripped:
<img src=x onerror=alert(document.cookie)>`;

const DOM_SINK = `// Client-side code, runs entirely in the browser
document.getElementById("out").innerHTML = location.hash.slice(1);
// URL: https://app.example.com/page#<img src=x onerror=alert(1)>`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function AdvancedXssClient({
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
    if (checkFlag(t1Answer, "SAGE{1mg_0n3rr0r_byp4ss3s_f1lt3r}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. The filter only strips literal <script> tags — what else can run JS?");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "XSS doesn't require the script tag at all — any element with an event handler attribute can execute JavaScript") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Think about what actually triggers JS execution in a browser beyond the <script> tag.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "The malicious data (URL fragment) never gets sent to the server at all — it's processed entirely client-side") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Consider where location.hash actually travels.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Bypass the Filter" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">A comment field's server-side sanitization, and a payload that got through:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{FILTER_CODE}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What payload bypasses this naive &lt;script&gt; tag filter?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — &lt;img src=x onerror=...&gt; never contains "script" and still executes JS. Flag: SAGE&#123;1mg_0n3rr0r_byp4ss3s_f1lt3r&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Understand the Filter Gap" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-4">The filter blocks only the literal string &lt;script&gt;.</p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Why does a filter that only blocks the literal &lt;script&gt; string fail here?</p>
            <div className="flex flex-col gap-2">
              {[
                "XSS doesn't require the script tag at all — any element with an event handler attribute can execute JavaScript",
                "Because the browser ignores all sanitization by default",
                "Because comment fields are never sanitized in modern frameworks",
                "Because the regex has a typo that makes it non-functional",
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
          <p className="text-sm font-mono text-sage-400">Correct — any element with an inline event handler attribute can execute script, no &lt;script&gt; tag needed. Flag: SAGE&#123;3v3nt_h4ndl3rs_n0_scr1pt_n33d3d&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Spot the DOM-Based Sink" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-3">A separate part of the app has this client-side code:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-red-300 whitespace-pre-wrap overflow-x-auto">{DOM_SINK}</pre>
        </div>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Why can server-side input sanitization completely miss this vulnerability?</p>
            <div className="flex flex-col gap-2">
              {[
                "The malicious data (URL fragment) never gets sent to the server at all — it's processed entirely client-side",
                "The server always sanitizes innerHTML assignments automatically",
                "location.hash is encrypted so the server can't read it anyway",
                "DOM-based XSS doesn't actually execute JavaScript",
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
            Correct — the URL fragment never reaches the server, so server-side filtering can't touch it at all.
            Flag: SAGE&#123;cl13nt_s1d3_0nly_n3v3r_s3rv3r&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;1mg_0n3rr0r_byp4ss3s_f1lt3r&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;3v3nt_h4ndl3rs_n0_scr1pt_n33d3d&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;cl13nt_s1d3_0nly_n3v3r_s3rv3r&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
