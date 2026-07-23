"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const ALERT_STATS = `Rule: "Multiple Failed Logins Followed By Success"
Last 30 days: 1,240 alerts fired
Analyst review of a 50-alert sample:
  - 46 were IT helpdesk password resets (user mistypes old password, then succeeds)
  - 3 were real brute-force attempts correctly caught
  - 1 was inconclusive
True positive rate from sample: 4/50 (~8%)`;

const CURRENT_RULE = `condition:
  failed_logins >= 3
  AND success_login_within: 10m
  AND same_user: true`;

const HELPDESK_CONTEXT = `IT helpdesk process: after a password reset, the user's OLD cached
credentials on their laptop/phone continue auto-retrying for a few
minutes before the NEW password takes over — producing 3-5 automatic
failures from the SAME device, then one success once the device
picks up the new password.

Genuine brute-force attempts in the sample came from unfamiliar
IPs/devices never seen for that account before.`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function DetectionTuningClient({
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
    if (checkFlag(t1Answer, "SAGE{8_p3rc3nt_tru3_p0s1t1v3}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Calculate the percentage of the sample that were confirmed real attacks.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "Password reset events cause old cached credentials to auto-retry, matching the same pattern") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Read the helpdesk context again — what routine IT process produces the exact same log pattern?");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Suppress alerts within N minutes of a known password-reset event for that account") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. The rule's core logic isn't wrong — it's missing one piece of context. What context would filter out the noise without missing real attacks?");
    }
  }

  return (
    <div className="space-y-6">
      {/* Task 1 */}
      <TaskShell number={1} title="Measure the Noise" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">A brute-force detection rule fires constantly. You sample 50 alerts to review.</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{ALERT_STATS}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Flag the true-positive rate from this sample, as a percentage.</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — 4 of 50 (8%) were real attacks; the other 92% is noise drowning out the signal and causing alert fatigue. Flag: SAGE&#123;8_p3rc3nt_tru3_p0s1t1v3&#125;</p>
        )}
      </TaskShell>

      {/* Task 2 */}
      <TaskShell number={2} title="Find the Root Cause of the Noise" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">The current rule and IT helpdesk context:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-3">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{CURRENT_RULE}</pre>
        </div>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{HELPDESK_CONTEXT}</pre>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Why does this rule generate so many false positives?</p>
            <div className="flex flex-col gap-2">
              {[
                "The threshold of 3 failed logins is too low for any environment",
                "Password reset events cause old cached credentials to auto-retry, matching the same pattern",
                "The rule has a syntax error",
                "10 minutes is too long a window for any detection",
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
          <p className="text-sm font-mono text-sage-400">Correct — a routine, entirely benign IT process (password resets) produces logs that are structurally identical to a real brute-force success, without any context to distinguish them. Flag: SAGE&#123;p4ssw0rd_r3s3t_n0is3&#125;</p>
        )}
      </TaskShell>

      {/* Task 3 */}
      <TaskShell number={3} title="Tune the Rule" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">
          You need to cut the noise without missing the 3 real attacks that were correctly caught.
        </p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's the best tuning approach?</p>
            <div className="flex flex-col gap-2">
              {[
                "Raise the failed-login threshold to 20 to reduce volume",
                "Suppress alerts within N minutes of a known password-reset event for that account",
                "Disable the rule entirely since it's mostly noise",
                "Only alert during business hours",
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
            Correct — correlating against the password-reset event log (a piece of context the original rule ignored)
            filters out the known-benign pattern while leaving genuine brute-force detection fully intact. Flag: SAGE&#123;c0nt3xt_4w4r3_suppr3ss10n&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;8_p3rc3nt_tru3_p0s1t1v3&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;p4ssw0rd_r3s3t_n0is3&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;c0nt3xt_4w4r3_suppr3ss10n&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
