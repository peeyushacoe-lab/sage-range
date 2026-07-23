"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const NOTICE = `Notice received from Managed Service Provider "NetOpsPro":
"We are writing to inform you that our internal environment experienced a
security incident. NetOpsPro maintains standing remote-access credentials
into your network for monitoring purposes. We are still investigating the
full scope of our own breach."`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function ThirdPartyVendorCompromiseClient({
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
    if (checkFlag(t1Answer, "SAGE{4ssum3_v3nd0r_cr3ds_c0mpr0m1s3d}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. The vendor's own environment holds the credentials they use to reach your network — what must you assume about those?");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "Immediately revoke or disable the vendor's remote access credentials/connections until their breach is fully understood") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Don't wait for the vendor's own investigation to finish before protecting your side.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Whether third-party access follows least-privilege and is properly monitored/logged, not just trusted by default") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Think about the broader lesson for how vendors are trusted and access is granted going forward.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Assess the Exposure" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">A notice arrives from a trusted managed service provider:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{NOTICE}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What must you assume about the credentials the vendor used to access your environment?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — you must assume the vendor's credentials into your environment are compromised too. Flag: SAGE&#123;4ssum3_v3nd0r_cr3ds_c0mpr0m1s3d&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Act on Your Side Now" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-4">The vendor says their investigation is still ongoing and could take weeks.</p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's the immediate action regarding the vendor's access to your environment?</p>
            <div className="flex flex-col gap-2">
              {[
                "Immediately revoke or disable the vendor's remote access credentials/connections until their breach is fully understood",
                "Wait for the vendor's investigation to conclude before doing anything",
                "Only monitor the vendor's activity more closely, without changing access",
                "Terminate the vendor relationship entirely without any interim step",
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
          <p className="text-sm font-mono text-sage-400">Correct — revoke or disable the vendor's access now rather than waiting on their own investigation timeline. Flag: SAGE&#123;r3v0k3_v3nd0r_4cc3ss_n0w&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Learn the Broader Lesson" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">Access is revoked and the immediate risk is contained.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What should this incident prompt you to review going forward regarding third parties generally?</p>
            <div className="flex flex-col gap-2">
              {[
                "Whether third-party access follows least-privilege and is properly monitored/logged, not just trusted by default",
                "Nothing — this was purely the vendor's fault and requires no changes on your end",
                "Whether to stop using any third-party vendors ever again",
                "Only whether the vendor's contract includes a liability clause",
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
            Correct — this should prompt a review of least-privilege and monitoring for all third-party access, not blind default trust.
            Flag: SAGE&#123;l34st_pr1v_4nd_m0n1t0r_v3nd0rs&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;4ssum3_v3nd0r_cr3ds_c0mpr0m1s3d&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;r3v0k3_v3nd0r_4cc3ss_n0w&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;l34st_pr1v_4nd_m0n1t0r_v3nd0rs&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
