"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const INTERCEPT = `POST /api/account/update HTTP/1.1
Host: app.example.com
Content-Type: application/json

{"userId": 42, "role": "user", "email": "j.doe@example.com"}`;

const REPEATER_RESULT = `POST /api/account/update  (role changed to "admin" in Repeater)
HTTP/1.1 200 OK
{"status": "ok", "role": "admin"}
--- Reloading /dashboard now shows full Admin Panel ---`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function BurpSuiteWorkflowClient({
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
    if (t1Choice === "Repeater") {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. You want to manually resend one request and tweak it, not automate anything yet.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (checkFlag(t2Answer, "SAGE{r0l3_p4r4m_pr1v_3sc4l4t10n}")) {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Describe what class of vulnerability this role-parameter tampering represents.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Intruder") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. You need something that automates trying thousands of values.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Intercept and Choose Your Tool" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">An intercepted request in Burp's Proxy tab:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{INTERCEPT}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Which Burp tool would you use to manually resend this request with role changed to admin and observe the response?</p>
            <div className="flex flex-col gap-2">
              {["Repeater", "Intruder", "Decoder", "Sequencer"].map((opt) => (
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
          <p className="text-sm font-mono text-sage-400">Correct — Repeater is Burp's tool for manual, one-off request tampering. Flag: SAGE&#123;r3p34t3r_f0r_m4nu4l_t4mp3r1ng&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Confirm the Impact" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">Result after resending with role changed in Repeater:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-red-300 whitespace-pre-wrap overflow-x-auto">{REPEATER_RESULT}</pre>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What vulnerability does this confirm?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t2Answer} onChange={setT2Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t2Error && <p className="text-xs text-red-400 font-mono">{t2Error}</p>}
            <HintPanel labId={labId} stage="task_2" />
          </form>
        )}
        {done("task_2") && (
          <p className="text-sm font-mono text-sage-400">Correct — changing the role parameter grants full admin access: vertical privilege escalation. Flag: SAGE&#123;r0l3_p4r4m_pr1v_3sc4l4t10n&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Automate the Attack" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">There's also a 4-digit PIN field guarding a sensitive action, with no rate limiting.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Which Burp tool would you use to automatically brute-force this PIN across all 10,000 combinations?</p>
            <div className="flex flex-col gap-2">
              {["Intruder", "Repeater", "Comparer", "Extender"].map((opt) => (
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
            Correct — Intruder automates payload brute-forcing across a defined position, exactly what a PIN field needs.
            Flag: SAGE&#123;1ntrud3r_f0r_p1n_bruteforce&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;r3p34t3r_f0r_m4nu4l_t4mp3r1ng&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;r0l3_p4r4m_pr1v_3sc4l4t10n&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;1ntrud3r_f0r_p1n_bruteforce&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
