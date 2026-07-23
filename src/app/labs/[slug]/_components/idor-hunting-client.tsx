"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const REQUESTS = `GET /api/invoices/1001          -> 200 { "owner": "you@corp.com", "total": 240.00 }
GET /api/invoices/1002          -> 200 { "owner": "priya@otherco.com", "total": 18400.00 }
GET /api/invoices/1003          -> 200 { "owner": "marcus@thirdco.com", "total": 5200.00 }`;

const API_CODE = `app.get('/api/invoices/:id', requireLogin, async (req, res) => {
  const invoice = await db.invoice.findUnique({ where: { id: req.params.id } });
  res.json(invoice);
  // NOTE: no check that invoice.userId === req.session.userId
});`;

const SECOND_ENDPOINT = `PATCH /api/users/482/role
Body: { "role": "admin" }
Auth: session belongs to user 482 (a normal STUDENT account)
Response: 200 { "id": 482, "role": "admin" }`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function IdorHuntingClient({
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
    if (checkFlag(t1Answer, "SAGE{pr1y4_18400_1nv0ic3_l34k}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Flag the other user's email and their invoice total, in the flag format.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "The endpoint never verifies the invoice belongs to the requesting user") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Re-read the code comment — what check is explicitly missing?");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Mass assignment / broken function-level authorization — a user can escalate their own role") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Think about who is being modified, and by whom — and what field is being changed.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Task 1 */}
      <TaskShell number={1} title="Spot the Leak" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">
          You&apos;re logged in as <code className="text-amber-300">you@corp.com</code> and view your own invoice at
          <code className="text-amber-300"> /api/invoices/1001</code>. Out of curiosity, you increment the ID.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{REQUESTS}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Flag the leaked user's email and invoice total.</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — invoice 1002 belongs to priya@otherco.com, totalling $18,400, fully exposed by changing the ID. Flag: SAGE&#123;pr1y4_18400_1nv0ic3_l34k&#125;</p>
        )}
      </TaskShell>

      {/* Task 2 */}
      <TaskShell number={2} title="Find the Root Cause" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">The invoice API's server-side code:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{API_CODE}</pre>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's the exact bug?</p>
            <div className="flex flex-col gap-2">
              {[
                "The database query is vulnerable to SQL injection",
                "The endpoint never verifies the invoice belongs to the requesting user",
                "The login requirement is missing entirely",
                "The response format is incorrect",
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
          <p className="text-sm font-mono text-sage-400">Correct — requireLogin only checks that SOMEONE is logged in, not that THIS invoice belongs to them. That missing ownership check is the entire bug. Flag: SAGE&#123;m1ss1ng_0wn3rsh1p_ch3ck&#125;</p>
        )}
      </TaskShell>

      {/* Task 3 */}
      <TaskShell number={3} title="Assess a Second Endpoint" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-3">
          While testing, you also find a user profile endpoint with a similar flaw — but the impact here is worse.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{SECOND_ENDPOINT}</pre>
        </div>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What class of vulnerability does this represent?</p>
            <div className="flex flex-col gap-2">
              {[
                "SSRF — the server is making an unintended request",
                "Mass assignment / broken function-level authorization — a user can escalate their own role",
                "XSS — a script is being reflected back",
                "CSRF — a forged request from another site",
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
            Correct — the endpoint let user 482 modify their own "role" field with no server-side check on which
            fields are safe to self-edit, letting any student self-promote to admin. Flag: SAGE&#123;s3lf_pr0m0t3_4dm1n_r0l3&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;pr1y4_18400_1nv0ic3_l34k&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;m1ss1ng_0wn3rsh1p_ch3ck&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;s3lf_pr0m0t3_4dm1n_r0l3&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
