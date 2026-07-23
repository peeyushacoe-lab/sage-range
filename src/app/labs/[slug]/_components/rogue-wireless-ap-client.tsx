"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const SCAN = `Wireless scan results:
SSID: "CorpWiFi_Guest"   (authorized corporate guest network)
SSID: "CorpWiFi-Guest"   (NOT in asset inventory, signal strongest near lobby)

The rogue SSID differs from the real one by a single character (dash vs underscore).`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function RogueWirelessApClient({
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
    if (checkFlag(t1Answer, "SAGE{ev1l_tw1n_4p_l00k4l1k3_ss1d}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. What's this look-alike SSID technique commonly called?");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "Triangulating signal strength across multiple scan points helps physically locate the device within the building") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Think about how signal strength readings from different spots help narrow down a physical location.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Force a password reset for potentially affected accounts, since credentials may have been captured over the rogue AP") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Think about what could have happened to anyone who connected to the rogue AP.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Identify the Attack" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">A wireless scan of the office turns up something unexpected:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{SCAN}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What kind of attack is this look-alike SSID designed to enable?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — this is an evil-twin AP designed to trick users into connecting via a near-identical SSID. Flag: SAGE&#123;ev1l_tw1n_4p_l00k4l1k3_ss1d&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Locate the Device" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-4">You need to physically find and remove the rogue device.</p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Why is physical signal strength/location important in tracking down this rogue AP?</p>
            <div className="flex flex-col gap-2">
              {[
                "Triangulating signal strength across multiple scan points helps physically locate the device within the building",
                "Signal strength has no bearing on locating the physical device",
                "Only the MAC address matters, never the signal strength",
                "You should just disconnect the corporate Wi-Fi instead of locating the rogue device",
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
          <p className="text-sm font-mono text-sage-400">Correct — triangulating signal strength from multiple points narrows down where the physical device is hidden. Flag: SAGE&#123;tr14ngul4t3_s1gn4l_l0c4t3_d3v1c3&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Protect Affected Users" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">The rogue AP has been found and physically removed.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Once located and removed, what should also be done for anyone who may have connected to it?</p>
            <div className="flex flex-col gap-2">
              {[
                "Force a password reset for potentially affected accounts, since credentials may have been captured over the rogue AP",
                "Nothing further is needed once the device is removed",
                "Only warn users verbally with no technical follow-up",
                "Only reset the Wi-Fi password, not any user accounts",
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
            Correct — force a password reset for potentially affected accounts, since traffic and credentials may have been intercepted.
            Flag: SAGE&#123;r3s3t_cr3ds_p0t3nt14lly_c4ptur3d&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;ev1l_tw1n_4p_l00k4l1k3_ss1d&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;tr14ngul4t3_s1gn4l_l0c4t3_d3v1c3&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;r3s3t_cr3ds_p0t3nt14lly_c4ptur3d&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
