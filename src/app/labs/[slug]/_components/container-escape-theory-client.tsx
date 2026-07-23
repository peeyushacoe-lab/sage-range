"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const MODEL = `Virtual Machines:
- Each VM runs its own full kernel
- Isolation boundary: the hypervisor

Containers:
- All containers on a host share that host's single kernel
- Isolation boundary: namespaces, cgroups, and the container runtime — all running atop the shared kernel`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function ContainerEscapeTheoryClient({
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
    if (checkFlag(t1Answer, "SAGE{sh4r3d_h0st_k3rn3l}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Compare what a hypervisor separates for VMs versus what containers run on top of.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "A vulnerability in the shared kernel or container runtime that lets a process break out of its namespace/cgroup isolation") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Think about what a process would need to break to escape its isolation boundary.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "A separate VM (or gVisor/Kata-style sandboxed runtime) rather than a standard container, since containers share the kernel attack surface") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Given the shared kernel, what actually gives hostile workloads a real boundary?");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Compare the Isolation Models" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">How VMs and containers differ in their isolation model:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{MODEL}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What do all containers on a host share that VMs do not?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — all containers on a host share that host's single kernel, unlike VMs which each get their own. Flag: SAGE&#123;sh4r3d_h0st_k3rn3l&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Understand What an Escape Exploits" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-4">Given the shared kernel model, think about what a container escape actually has to break.</p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Given that shared kernel, what does a container escape fundamentally exploit?</p>
            <div className="flex flex-col gap-2">
              {[
                "A vulnerability in the shared kernel or container runtime that lets a process break out of its namespace/cgroup isolation",
                "A weak password on the container's application layer",
                "A misconfigured DNS resolver inside the container",
                "An expired TLS certificate on the container registry",
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
          <p className="text-sm font-mono text-sage-400">Correct — an escape exploits a kernel or runtime vulnerability to break out of namespace/cgroup isolation. Flag: SAGE&#123;3xpl01t_k3rn3l_0r_runt1m3_bug&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Find the Real Boundary" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">Your team needs to run genuinely untrusted, potentially hostile third-party workloads.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Given this, what's the real practical security boundary for genuinely untrusted, hostile workloads?</p>
            <div className="flex flex-col gap-2">
              {[
                "A separate VM (or gVisor/Kata-style sandboxed runtime) rather than a standard container, since containers share the kernel attack surface",
                "A standard container is always sufficient regardless of trust level",
                "Running the workload with more CPU and memory limits",
                "Using a container without a network connection",
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
            Correct — a VM or a sandboxed runtime gives a real boundary that standard containers, sharing the kernel, can't provide.
            Flag: SAGE&#123;vm_b0und4ry_f0r_untrust3d_w0rkl04ds&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;sh4r3d_h0st_k3rn3l&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;3xpl01t_k3rn3l_0r_runt1m3_bug&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;vm_b0und4ry_f0r_untrust3d_w0rkl04ds&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
