"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const CLOUDTRAIL_EVENTS = `{"eventTime":"2026-05-09T02:14:11Z","eventName":"GetCallerIdentity","userIdentity":{"accessKeyId":"AKIAEXAMPLE1"},"sourceIPAddress":"103.22.14.9"}
{"eventTime":"2026-05-09T02:14:19Z","eventName":"ListBuckets","userIdentity":{"accessKeyId":"AKIAEXAMPLE1"},"sourceIPAddress":"103.22.14.9"}
{"eventTime":"2026-05-09T02:15:02Z","eventName":"CreateUser","requestParameters":{"userName":"backup-svc2"},"userIdentity":{"accessKeyId":"AKIAEXAMPLE1"},"sourceIPAddress":"103.22.14.9"}
{"eventTime":"2026-05-09T02:15:07Z","eventName":"AttachUserPolicy","requestParameters":{"userName":"backup-svc2","policyArn":"arn:aws:iam::aws:policy/AdministratorAccess"},"userIdentity":{"accessKeyId":"AKIAEXAMPLE1"},"sourceIPAddress":"103.22.14.9"}
{"eventTime":"2026-05-09T02:15:44Z","eventName":"CreateAccessKey","requestParameters":{"userName":"backup-svc2"},"userIdentity":{"accessKeyId":"AKIAEXAMPLE1"},"sourceIPAddress":"103.22.14.9"}`;

const NORMAL_LOCATION = `Known-good access pattern for AKIAEXAMPLE1 (last 90 days):
  Source IPs: 10.40.0.0/16 (office VPN range only)
  Typical actions: ListBuckets, GetObject, PutObject (S3 data pipeline role)
  Never before seen: CreateUser, AttachUserPolicy, CreateAccessKey`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function CloudtrailAnalysisClient({
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
    if (checkFlag(t1Answer, "SAGE{b4ckup_svc2_4dm1n_b4ckd00r}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Flag the new username created, and the policy attached to it, together.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "The source IP is outside the known-good office VPN range entirely") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Compare the sourceIPAddress in the events against the known-good access pattern.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Delete the rogue user, revoke/rotate the compromised access key, and review CloudTrail for further abuse") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. What must happen to both the leaked credential AND the backdoor account it created?");
    }
  }

  return (
    <div className="space-y-6">
      {/* Task 1 */}
      <TaskShell number={1} title="Spot the Escalation" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">CloudTrail logs a burst of API calls from a single access key.</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{CLOUDTRAIL_EVENTS}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Flag the new username created and the policy attached to it.</p>
            <div className="flex gap-2 max-w-lg">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — "backup-svc2" was created and immediately granted full AdministratorAccess, then given its own access key — a textbook cloud persistence backdoor. Flag: SAGE&#123;b4ckup_svc2_4dm1n_b4ckd00r&#125;</p>
        )}
      </TaskShell>

      {/* Task 2 */}
      <TaskShell number={2} title="Confirm Compromise via Location" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">The account's normal usage pattern:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{NORMAL_LOCATION}</pre>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What confirms this key is compromised, not just being misused internally?</p>
            <div className="flex flex-col gap-2">
              {[
                "The timestamp is at night",
                "The source IP is outside the known-good office VPN range entirely",
                "The access key ID format looks unusual",
                "CreateUser calls are always malicious",
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
          <p className="text-sm font-mono text-sage-400">Correct — 103.22.14.9 is nowhere near the 10.40.0.0/16 office VPN range this key normally uses, combined with actions it has never performed before. Strong compromise signal. Flag: SAGE&#123;s0urc3_1p_4n0m4ly&#125;</p>
        )}
      </TaskShell>

      {/* Task 3 */}
      <TaskShell number={3} title="Remediate" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">You've confirmed the key is compromised and a backdoor admin account exists.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's the full remediation?</p>
            <div className="flex flex-col gap-2">
              {[
                "Just delete the backup-svc2 user and consider it resolved",
                "Delete the rogue user, revoke/rotate the compromised access key, and review CloudTrail for further abuse",
                "Rotate the key only, leave the new user in case it's needed later",
                "Do nothing until legal approves",
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
            Correct — you must close both doors: revoke/rotate the leaked original key (root cause) AND delete the
            backdoor account it created (persistence), then audit the rest of CloudTrail for anything else this
            access enabled. Flag: SAGE&#123;r3v0k3_4nd_d3l3t3_b4ckd00r&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;b4ckup_svc2_4dm1n_b4ckd00r&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;s0urc3_1p_4n0m4ly&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;r3v0k3_4nd_d3l3t3_b4ckd00r&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
