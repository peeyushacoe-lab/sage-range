"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const BOOLEAN_TEST = `Payload: username=admin' AND 1=1--
Response: normal login page (login failed, but no error)

Payload: username=admin' AND 1=2--
Response: different page — "Account locked" message shown instead`;

const TIME_TEST = `Payload: username=admin' AND IF(SUBSTRING(database(),1,1)='a', SLEEP(5), 0)--
Response time: 5.2 seconds (vs ~80ms for a normal request)`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function AdvancedSqlInjectionClient({
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
    if (t1Choice === "Boolean-based blind SQL injection is possible — the app's behavior itself leaks true/false conditions") {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. There are no SQL error messages here — focus on the difference in page behavior instead.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (checkFlag(t2Answer, "SAGE{t1m3_b4s3d_bl1nd_3xtr4ct10n}")) {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. What SQLi technique uses response delay rather than visible page differences?");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "It relies purely on measurable response delay, which exists regardless of what content the page shows") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Think about what SLEEP() actually measures versus what boolean-blind relies on.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Confirm Blind Injection" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">A login form shows no SQL errors at all. Two test payloads:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{BOOLEAN_TEST}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What does the different response between these two payloads confirm, even with no visible SQL errors?</p>
            <div className="flex flex-col gap-2">
              {[
                "Boolean-based blind SQL injection is possible — the app's behavior itself leaks true/false conditions",
                "The application is completely immune to SQL injection",
                "The database is misconfigured but not exploitable",
                "This only proves a network timing issue, not an injection",
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
          <p className="text-sm font-mono text-sage-400">Correct — the differing response between true and false conditions confirms boolean-blind SQLi. Flag: SAGE&#123;b00l3an_bl1nd_sql1_c0nf1rm3d&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Extract Data With Timing" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">A follow-up payload used to extract the database name character by character:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-red-300 whitespace-pre-wrap overflow-x-auto">{TIME_TEST}</pre>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What SQLi technique uses response delay instead of visible differences to extract data?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t2Answer} onChange={setT2Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t2Error && <p className="text-xs text-red-400 font-mono">{t2Error}</p>}
            <HintPanel labId={labId} stage="task_2" />
          </form>
        )}
        {done("task_2") && (
          <p className="text-sm font-mono text-sage-400">Correct — this is time-based blind SQL injection, extracting data via response delay. Flag: SAGE&#123;t1m3_b4s3d_bl1nd_3xtr4ct10n&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Understand Why It Still Works" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">Suppose the app's error page and success page were made to look byte-for-byte identical.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Why is time-based blind SQLi still viable even when boolean-blind differences are hidden by identical page content?</p>
            <div className="flex flex-col gap-2">
              {[
                "It relies purely on measurable response delay, which exists regardless of what content the page shows",
                "It doesn't need a vulnerable parameter at all",
                "It only works on databases that return visible errors",
                "It requires the application to log all queries",
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
            Correct — the delay itself is the signal, independent of any content difference on the page.
            Flag: SAGE&#123;d3l4y_1nd3p3nd3nt_0f_c0nt3nt&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;b00l3an_bl1nd_sql1_c0nf1rm3d&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;t1m3_b4s3d_bl1nd_3xtr4ct10n&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;d3l4y_1nd3p3nd3nt_0f_c0nt3nt&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
