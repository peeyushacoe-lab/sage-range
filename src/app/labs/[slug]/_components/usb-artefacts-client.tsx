"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const USBSTOR_ENTRY = `USBSTOR\\Disk&Ven_SanDisk&Prod_Cruzer&Rev_1.00\\4C530001A1B2C3D4&0
  FriendlyName: SanDisk Cruzer Blade USB Device
  First Connected: 2026-04-02 08:10:03
  Last Connected:  2026-04-09 17:44:12`;

const SHELLBAG_ENTRY = `Shellbag entry — Explorer folder view state:
  Path: E:\\Confidential\\
  Volume Serial referenced: 4C530001A1B2C3D4
  Last accessed: 2026-04-09 17:40:55`;

const DLP_LOG = `DLP Alert: 3.4 GB copied to E:\\ (removable media) — 2026-04-09 17:41:02 to 17:44:01`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function UsbArtefactsClient({
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
    if (checkFlag(t1Answer, "SAGE{4c530001a1b2c3d4_l4st_c0nn_apr9}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. The USBSTOR entry lists both the serial number and last-connected time directly.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "Files were browsed/accessed on that exact USB device, not just plugged in") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Think about what shellbags actually record versus what a registry connection entry alone proves.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "This device exfiltrated 3.4GB of data; image the device and preserve it as evidence before returning it") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Think about both the conclusion AND the correct evidence-handling next step.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Identify the Device" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">The USBSTOR registry key for the workstation in question:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{USBSTOR_ENTRY}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What is the serial number of this device and when was it last connected?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — serial 4C530001A1B2C3D4, last connected April 9. Flag: SAGE&#123;4c530001a1b2c3d4_l4st_c0nn_apr9&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Confirm Actual Access" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">A shellbag entry on the same workstation references the same volume serial:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{SHELLBAG_ENTRY}</pre>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What does this matching shellbag entry confirm?</p>
            <div className="flex flex-col gap-2">
              {[
                "Files were browsed/accessed on that exact USB device, not just plugged in",
                "The device was never actually connected",
                "Shellbags are unrelated to USB devices",
                "The volume serial number changed after connection",
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
          <p className="text-sm font-mono text-sage-400">Correct — shellbags prove the folder was actively browsed on that specific device, going beyond a mere connection record. Flag: SAGE&#123;sh3llb4gs_c0nf1rm_4cc3ss&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Confirm Exfiltration" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-3">A DLP alert from the same window of time:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{DLP_LOG}</pre>
        </div>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's the conclusion, and the correct next step?</p>
            <div className="flex flex-col gap-2">
              {[
                "This device exfiltrated 3.4GB of data; image the device and preserve it as evidence before returning it",
                "Nothing conclusive — coincidental timing",
                "Wipe the device immediately to prevent further data loss",
                "Return the device to the employee since the investigation is complete",
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
            Correct — the registry, shellbag, and DLP evidence together confirm exfiltration; image and preserve the physical device before anything else touches it.
            Flag: SAGE&#123;1m4g3_pr3s3rv3_3v1d3nc3&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;4c530001a1b2c3d4_l4st_c0nn_apr9&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;sh3llb4gs_c0nf1rm_4cc3ss&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;1m4g3_pr3s3rv3_3v1d3nc3&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
