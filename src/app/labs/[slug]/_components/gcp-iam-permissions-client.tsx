"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const IAM_BINDINGS = `Project: acme-prod-247
Bindings:
  role: roles/editor                member: serviceAccount:ci-deploy@acme-prod-247.iam.gserviceaccount.com
  role: roles/storage.objectViewer   member: user:dave@acmecorp.com
  role: roles/owner                  member: user:admin@acmecorp.com
  role: roles/viewer                 member: allAuthenticatedUsers`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function GcpIamPermissionsClient({
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
    if (checkFlag(t1Answer, "SAGE{4ll4uth3nt1c4t3dus3rs_v13w3r_3xp0sur3}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. One binding's member isn't a specific person or service account.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "Editor grants near-project-wide write access, far beyond what CI deploy actually touches") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Compare what Editor actually grants to the two specific services CI deploy uses.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Replace roles/editor with a custom role scoped to only Cloud Run deploy and Artifact Registry push") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. The fix should name the exact permissions the CI pipeline needs, nothing more.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Audit the IAM Bindings" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">You export the IAM policy for a production GCP project:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{IAM_BINDINGS}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Which binding grants access to anyone with any Google account, not just your org?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — allAuthenticatedUsers means any Google account anywhere on the internet, not just your organization. Flag: SAGE&#123;4ll4uth3nt1c4t3dus3rs_v13w3r_3xp0sur3&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Check the CI Service Account" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-4">The CI pipeline's job is only to deploy to Cloud Run and push images to Artifact Registry.</p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What is roles/editor's actual scope compared to what CI deploy needs?</p>
            <div className="flex flex-col gap-2">
              {[
                "Editor grants near-project-wide write access, far beyond what CI deploy actually touches",
                "Editor is scoped to exactly Cloud Run and Artifact Registry by default",
                "Editor is actually more restrictive than a custom role",
                "There's no meaningful difference between Editor and Viewer",
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
          <p className="text-sm font-mono text-sage-400">Correct — Editor grants broad write access across almost every service in the project, far more than a deploy pipeline needs. Flag: SAGE&#123;3d1t0r_t00_br04d_f0r_c1_d3pl0y&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Fix the Service Account" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">You need to tighten the CI service account without breaking its deploy pipeline.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's the correct fix for the CI service account?</p>
            <div className="flex flex-col gap-2">
              {[
                "Replace roles/editor with a custom role scoped to only Cloud Run deploy and Artifact Registry push",
                "Downgrade to roles/viewer so it can at least still read configs",
                "Leave roles/editor since CI needs broad access to function reliably",
                "Just remove the binding entirely",
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
            Correct — a custom role naming exactly the Cloud Run deploy and Artifact Registry push permissions keeps the pipeline working with the minimum footprint.
            Flag: SAGE&#123;cust0m_r0l3_c1_sc0p3d&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;4ll4uth3nt1c4t3dus3rs_v13w3r_3xp0sur3&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;3d1t0r_t00_br04d_f0r_c1_d3pl0y&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;cust0m_r0l3_c1_sc0p3d&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
