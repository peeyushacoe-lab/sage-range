"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const ABUSE_REPORT = `IP: 185.220.101.45
Abuse Confidence Score: 98%
Total Reports: 342 (last 90 days)
Categories: SSH Brute-Force, Port Scan, Web App Attack
ISP: Unknown VPS Provider
Country: Unlisted (Tor exit node range)
Last Reported: 6 hours ago`;

const INTERNAL_ALERT = `SOC Alert #4471
Source: 185.220.101.45
Target: bastion-01.acmecorp.internal
Event: 214 failed SSH authentication attempts in 12 minutes, rotating usernames`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function AbuseipdbInvestigationClient({
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
    if (checkFlag(t1Answer, "SAGE{98_p3rc3nt_342_r3p0rts}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Flag the confidence score and the number of reports behind it.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "SSH Brute-Force") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Match the SOC alert's behavior to one of the listed categories.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Block the IP at the firewall immediately and review bastion auth logs for any successful logins") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. A 98% score with a corroborating alert against a bastion host needs action now, not just logging.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Read the Report" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">An IP shows up repeatedly in your logs. You check it against AbuseIPDB:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{ABUSE_REPORT}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Flag the abuse confidence score and the report count backing it.</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — 98% confidence, backed by 342 reports. Flag: SAGE&#123;98_p3rc3nt_342_r3p0rts&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Corroborate Against Your Alert" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">Your SOC just fired an alert involving the same IP:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{INTERNAL_ALERT}</pre>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Which AbuseIPDB category directly corroborates this alert?</p>
            <div className="flex flex-col gap-2">
              {["SSH Brute-Force", "Port Scan", "Web App Attack", "Fraud Orders"].map((opt) => (
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
          <p className="text-sm font-mono text-sage-400">Correct — 214 rotating-username SSH failures is textbook brute-forcing, matching the SSH Brute-Force category. Flag: SAGE&#123;ssh_brut3_f0rc3_c0rr0b0r4t3d&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Decide the Response" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">You now have a 98%-confidence, 342-report IP actively brute-forcing your bastion host.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's the appropriate response?</p>
            <div className="flex flex-col gap-2">
              {[
                "Wait for a few more reports before acting",
                "Block the IP at the firewall immediately and review bastion auth logs for any successful logins",
                "Only log it for the weekly report",
                "Email the ISP and wait for their response before doing anything else",
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
            Correct — block now, and check whether any of those 214 attempts actually succeeded before you closed the door.
            Flag: SAGE&#123;bl0ck_4nd_r3v13w_4uth_l0gs&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;98_p3rc3nt_342_r3p0rts&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;ssh_brut3_f0rc3_c0rr0b0r4t3d&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;bl0ck_4nd_r3v13w_4uth_l0gs&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
