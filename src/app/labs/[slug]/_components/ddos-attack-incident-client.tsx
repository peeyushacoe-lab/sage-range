"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const TRAFFIC = `Traffic graph, /login endpoint:
Normal baseline:      ~200 requests/min
Current inbound:       10,100 requests/min (50x baseline)
Distinct source IPs:   6,200+ unique addresses
All requests target the same single endpoint`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function DdosAttackIncidentClient({
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
    if (checkFlag(t1Answer, "SAGE{50x_b4s3l1n3_thous4nds_0f_1ps}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Look at how far above baseline this is, and how many distinct sources are involved.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "Route traffic through a DDoS scrubbing/mitigation service or CDN that can absorb and filter the volume before it reaches your origin") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Think about what can absorb this volume before it ever hits your own servers.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "A DDoS can also be cover for a credential stuffing attempt hidden inside the traffic flood, so endpoint-level limits still matter") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Think about what else could be happening inside a flood of login-endpoint traffic.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Confirm This Is a DDoS" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">Traffic to the public login endpoint has spiked dramatically:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{TRAFFIC}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What confirms this is a DDoS rather than a legitimate traffic surge or internal failure?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — 50x normal baseline traffic from thousands of distinct IPs confirms a DDoS. Flag: SAGE&#123;50x_b4s3l1n3_thous4nds_0f_1ps&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Mitigate the Volume" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-4">The service is going down under the load.</p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's the fastest practical mitigation for a volumetric attack like this?</p>
            <div className="flex flex-col gap-2">
              {[
                "Route traffic through a DDoS scrubbing/mitigation service or CDN that can absorb and filter the volume before it reaches your origin",
                "Add more application servers to handle the extra load",
                "Ask all 6,200 IP owners to stop sending traffic",
                "Shut down the login endpoint permanently",
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
          <p className="text-sm font-mono text-sage-400">Correct — a scrubbing service or CDN can absorb and filter the volume before your origin ever sees it. Flag: SAGE&#123;scrubb1ng_s3rv1c3_4bs0rbs_v0lum3&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Watch for What's Hidden" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">Mitigation is in place, but the login endpoint's own rate limiting is still active too.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Why is it important to keep the login endpoint's own rate limiting in place even after DDoS mitigation kicks in?</p>
            <div className="flex flex-col gap-2">
              {[
                "A DDoS can also be cover for a credential stuffing attempt hidden inside the traffic flood, so endpoint-level limits still matter",
                "It's not important — DDoS mitigation alone is always sufficient",
                "Rate limiting only matters for API endpoints, not login pages",
                "Keeping it active would conflict with the scrubbing service",
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
            Correct — a flood can mask a credential stuffing attempt hiding inside it, so endpoint-level limits still matter.
            Flag: SAGE&#123;d0s_c4n_h1d3_cr3d_stuff1ng&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;50x_b4s3l1n3_thous4nds_0f_1ps&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;scrubb1ng_s3rv1c3_4bs0rbs_v0lum3&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;d0s_c4n_h1d3_cr3d_stuff1ng&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
