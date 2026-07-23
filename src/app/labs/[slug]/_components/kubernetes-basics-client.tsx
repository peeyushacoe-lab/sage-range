"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const POD_SPEC = `apiVersion: v1
kind: Pod
metadata:
  name: log-shipper
spec:
  containers:
    - name: shipper
      image: acme/log-shipper:1.4
      securityContext:
        privileged: true
      volumeMounts:
        - mountPath: /host
          name: host-root
  volumes:
    - name: host-root
      hostPath:
        path: /`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function KubernetesBasicsClient({
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
    if (checkFlag(t1Answer, "SAGE{pr1v1l3g3d_tru3_h0st_4cc3ss}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Look at the securityContext field on the container.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "A compromised container could read/write anything on the host, effectively escaping container isolation") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Think about what mounting the host's entire filesystem actually exposes.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Remove privileged mode and the hostPath mount; grant only the specific, minimal permissions the workload actually needs") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. The fix should remove unneeded access, not add compensating controls on top of it.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Find the Dangerous Setting" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">A pod spec headed for production review:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{POD_SPEC}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What single setting gives this pod essentially root access to the underlying host node?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — privileged: true gives this pod essentially root-level access to the host node. Flag: SAGE&#123;pr1v1l3g3d_tru3_h0st_4cc3ss&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Explain the hostPath Risk" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-4">The pod also mounts the host's root filesystem ("/") into the container.</p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Why is mounting the host's root filesystem into a container especially dangerous?</p>
            <div className="flex flex-col gap-2">
              {[
                "A compromised container could read/write anything on the host, effectively escaping container isolation",
                "It only affects performance, not security",
                "hostPath mounts are always read-only by default, so there's no risk",
                "This is a standard, low-risk practice recommended by Kubernetes",
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
          <p className="text-sm font-mono text-sage-400">Correct — a compromised container with this mount can read/write anything on the host, breaking isolation entirely. Flag: SAGE&#123;h0stp4th_bre4ks_1s0l4t10n&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Fix the Spec" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">Time to write the remediation for this pod spec.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's the right fix for this pod spec?</p>
            <div className="flex flex-col gap-2">
              {[
                "Remove privileged mode and the hostPath mount; grant only the specific, minimal permissions the workload actually needs",
                "Keep privileged mode but add a network policy",
                "Add a resource limit and call it fixed",
                "Switch the base image to a different vendor",
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
            Correct — removing privileged mode and the hostPath mount, and granting only least-privilege access, fixes this spec.
            Flag: SAGE&#123;l34st_pr1v_p0d_sp3c&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;pr1v1l3g3d_tru3_h0st_4cc3ss&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;h0stp4th_bre4ks_1s0l4t10n&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;l34st_pr1v_p0d_sp3c&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
