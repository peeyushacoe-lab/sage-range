"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const DOCKERFILE = `FROM ubuntu:latest

RUN apt-get update && apt-get install -y python3 python3-pip
COPY . /app
WORKDIR /app
RUN pip3 install -r requirements.txt

CMD ["python3", "app.py"]
# No USER instruction — process runs as root by default`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function DockerSecurityClient({
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
    if (checkFlag(t1Answer, "SAGE{r00t_us3r_4nd_unp1nn3d_t4g}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Look at both the missing USER instruction and the FROM line's tag.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "If an attacker breaks out of the container or exploits a kernel vulnerability, root inside the container often means root on the host too") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Container isolation isn't a perfect boundary — think about what happens if it fails.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "A mutable tag can silently change to a different (possibly compromised) image between builds, breaking reproducibility and supply-chain trust") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Think about what 'latest' can silently point to over time.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Spot the Two Risks" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">A Dockerfile under review before it ships:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{DOCKERFILE}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What two Dockerfile practices here create risk — one about privilege, one about supply chain?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — running as root (no USER instruction) and pulling an unpinned "latest" tag are the two risks here. Flag: SAGE&#123;r00t_us3r_4nd_unp1nn3d_t4g&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Explain the Privilege Risk" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-4">A developer argues running as root is fine because "it's isolated in a container anyway."</p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Why is running the container process as root risky even if the container is "just" isolated?</p>
            <div className="flex flex-col gap-2">
              {[
                "If an attacker breaks out of the container or exploits a kernel vulnerability, root inside the container often means root on the host too",
                "It's not actually risky at all — containers provide perfect isolation regardless of the user",
                "Root only matters for Windows containers, not Linux ones",
                "Root inside a container is always mapped to an unprivileged user on the host by default",
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
          <p className="text-sm font-mono text-sage-400">Correct — if isolation ever fails, root inside the container commonly means root on the host itself. Flag: SAGE&#123;r00t_1ns1d3_c4n_m34n_r00t_0uts1d3&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Explain the Supply-Chain Risk" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">The Dockerfile pulls FROM ubuntu:latest instead of a pinned digest.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Why pin the base image to a specific digest instead of a mutable tag like "latest"?</p>
            <div className="flex flex-col gap-2">
              {[
                "A mutable tag can silently change to a different (possibly compromised) image between builds, breaking reproducibility and supply-chain trust",
                "Pinning a digest makes builds faster, nothing else",
                "'latest' is always guaranteed to be the most secure version available",
                "Digests are only relevant for private registries, not public ones",
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
            Correct — a mutable tag can silently change between builds, so pinning a digest protects reproducibility and supply-chain trust.
            Flag: SAGE&#123;p1n_d1g3st_f0r_supply_ch41n&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;r00t_us3r_4nd_unp1nn3d_t4g&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;r00t_1ns1d3_c4n_m34n_r00t_0uts1d3&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;p1n_d1g3st_f0r_supply_ch41n&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
