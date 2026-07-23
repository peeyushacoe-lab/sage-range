"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const BUCKET_POLICY = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::acme-customer-backups/*"
    }
  ]
}`;

const BUCKET_SCAN = `$ curl https://acme-customer-backups.s3.amazonaws.com/2026-01-15-customers.csv
customer_id,name,email,ssn,card_last4
10021,J. Whitmore,j.whitmore@example.com,***-**-4471,4471
10022,R. Alvarez,r.alvarez@example.com,***-**-9902,9902
... (48,000 more rows)`;

const IAM_POLICY = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "*",
      "Resource": "*"
    }
  ]
}
Attached to: IAM User "ci-deploy-bot" (used by a CI/CD pipeline, long-lived access key)`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function CloudIamMisconfigurationClient({
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
    if (t1Choice === '"Principal": "*" grants access to literally anyone on the internet, not just your account') {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error('Incorrect. What does the wildcard "*" mean in the Principal field specifically?');
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (checkFlag(t2Answer, "SAGE{48000_r3c0rds_p11_3xp0s3d}")) {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Flag the total number of customer records exposed by this public bucket.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "It grants unrestricted access to every AWS action on every resource — full account takeover if the key leaks") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Read the Action and Resource fields literally — what do wildcards on BOTH mean together?");
    }
  }

  return (
    <div className="space-y-6">
      {/* Task 1 */}
      <TaskShell number={1} title="Review the Bucket Policy" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">A routine cloud security review pulls the policy on an S3 bucket storing customer backups.</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{BUCKET_POLICY}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's wrong with this policy?</p>
            <div className="flex flex-col gap-2">
              {[
                '"Effect": "Allow" is a syntax error',
                '"Principal": "*" grants access to literally anyone on the internet, not just your account',
                'The Sid field is missing a description',
                'Nothing — this is a standard read policy',
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
          <p className="text-sm font-mono text-sage-400">Correct — Principal: "*" combined with s3:GetObject means anyone on the internet, with no AWS account required, can read every object in this bucket. Flag: SAGE&#123;publ1c_pr1nc1p4l_w1ldc4rd&#125;</p>
        )}
      </TaskShell>

      {/* Task 2 */}
      <TaskShell number={2} title="Confirm the Exposure" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">You test the theory with an unauthenticated request:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{BUCKET_SCAN}</pre>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Flag the total number of customer records exposed.</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t2Answer} onChange={setT2Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t2Error && <p className="text-xs text-red-400 font-mono">{t2Error}</p>}
            <HintPanel labId={labId} stage="task_2" />
          </form>
        )}
        {done("task_2") && (
          <p className="text-sm font-mono text-sage-400">Correct — 48,000+ customer records including PII and partial card numbers, readable by anyone with the URL, with zero authentication. Flag: SAGE&#123;48000_r3c0rds_p11_3xp0s3d&#125;</p>
        )}
      </TaskShell>

      {/* Task 3 */}
      <TaskShell number={3} title="Review a Related IAM Policy" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-3">
          While investigating, you find the IAM policy attached to the account that manages this infrastructure.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{IAM_POLICY}</pre>
        </div>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's the impact of this IAM policy?</p>
            <div className="flex flex-col gap-2">
              {[
                "It only allows read access to S3",
                "It grants unrestricted access to every AWS action on every resource — full account takeover if the key leaks",
                "It's fine because it's only used by CI/CD",
                "IAM policies don't matter if MFA is enabled",
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
            Correct — Action: "*" and Resource: "*" together mean this identity can do anything to anything in the
            account. Attached to a long-lived CI/CD access key, a single leaked credential (e.g. in a public repo)
            means total account compromise. Flag: SAGE&#123;4dm1n_st4r_st4r_1am_p0l1cy&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;publ1c_pr1nc1p4l_w1ldc4rd&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;48000_r3c0rds_p11_3xp0s3d&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;4dm1n_st4r_st4r_1am_p0l1cy&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
