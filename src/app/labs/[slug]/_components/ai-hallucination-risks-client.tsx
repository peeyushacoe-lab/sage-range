"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const REPORT_EXCERPT = `AI-Generated Incident Summary (excerpt):
"The observed activity matches CVE-2025-99871, a critical remote code execution
flaw in the vendor's VPN appliance, first disclosed in March 2025. Immediate
patching is recommended."

Fact check: CVE-2025-99871 does not exist in the National Vulnerability Database.`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function AiHallucinationRisksClient({
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
    if (checkFlag(t1Answer, "SAGE{4i_h4llucin4t10n}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. What's the term for an AI confidently generating plausible but false information?");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "Decisions based on it could waste critical incident response time chasing a vulnerability that doesn't exist") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Think about what a responder does after reading this report.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Require human verification of any critical AI-generated claim against an authoritative source before acting on it") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. The safeguard needs to happen before anyone acts on the claim.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Name the Phenomenon" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">An AI-generated incident report excerpt, and a fact-check:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{REPORT_EXCERPT}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What is this phenomenon called when an AI generates plausible-sounding but false information?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — this is an AI hallucination: confident, detailed, and entirely fabricated. Flag: SAGE&#123;4i_h4llucin4t10n&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Assess the Real Impact" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-4">This report was about to trigger an emergency patch cycle.</p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Why is hallucination especially dangerous in a security report used to justify an emergency patch?</p>
            <div className="flex flex-col gap-2">
              {[
                "Decisions based on it could waste critical incident response time chasing a vulnerability that doesn't exist",
                "It has no real consequence since AI reports are informational only",
                "It only affects the report's formatting, not its conclusions",
                "Emergency patches are always low-risk regardless of the reason",
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
          <p className="text-sm font-mono text-sage-400">Correct — chasing a fabricated CVE wastes real incident response time and attention. Flag: SAGE&#123;w4st3d_1r_t1m3_0n_f4k3_cv3&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Recommend the Safeguard" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">You need a standing process to prevent this from happening again.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's the best safeguard against acting on a hallucinated AI claim in a high-stakes report?</p>
            <div className="flex flex-col gap-2">
              {[
                "Require human verification of any critical AI-generated claim against an authoritative source before acting on it",
                "Stop using AI for any security-related tasks entirely",
                "Trust the AI's confidence score as a substitute for verification",
                "Only use AI-generated reports for low-priority tickets",
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
            Correct — critical AI claims should always be verified against an authoritative source before anyone acts on them.
            Flag: SAGE&#123;v3r1fy_4g41nst_4uth0r1t4t1v3_s0urc3&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;4i_h4llucin4t10n&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;w4st3d_1r_t1m3_0n_f4k3_cv3&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;v3r1fy_4g41nst_4uth0r1t4t1v3_s0urc3&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
