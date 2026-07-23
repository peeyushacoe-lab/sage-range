"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const VT_REPORT = `Hash: a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
Detection: 52 / 71 security vendors flagged this file as malicious
Popular names: Emotet, TrojanDownloader:Win32/Emotet.AB, Trojan.GenericKD
First submission: 2026-01-08
Community tags: banker, downloader, macro, trojan
Behavior summary:
  - Drops a secondary payload to %APPDATA%\\Roaming\\svchost32.exe
  - Contacts C2 domains: cdn-update-service[.]net, mail-relay-secure[.]info
  - Creates scheduled task "AdobeFlashPlayerUpdate"`;

const RELATION_TAB = `Contacted Domains (VirusTotal Relations tab):
  cdn-update-service.net    — also flagged by 38/71 vendors, registered 4 days before the sample
  mail-relay-secure.info    — also flagged by 41/71 vendors, same registrar as above
Communicating Files: 14 other samples also contact cdn-update-service.net`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function VirustotalInvestigationClient({
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
    if (checkFlag(t1Answer, "SAGE{3m0t3t_52_0f_71_v3nd0rs}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Flag the malware family name and detection ratio from the report.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "A domain registered only 4 days before the malware sample first appeared") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Look at the registration date relative to when the sample was first seen.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Block both domains and hunt your own environment's logs for any historical contact with them") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Threat intel is only useful if you act on it — what's the two-part action here?");
    }
  }

  return (
    <div className="space-y-6">
      {/* Task 1 */}
      <TaskShell number={1} title="Read the Report" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">A suspicious attachment's hash comes back with this VirusTotal report:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{VT_REPORT}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Flag the malware family and its detection ratio.</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — 52 of 71 vendors identified this as Emotet, a well-known banking trojan/downloader. Flag: SAGE&#123;3m0t3t_52_0f_71_v3nd0rs&#125;</p>
        )}
      </TaskShell>

      {/* Task 2 */}
      <TaskShell number={2} title="Pivot on Infrastructure" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">You pivot to the Relations tab to check the C2 domains this sample contacts.</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{RELATION_TAB}</pre>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What makes cdn-update-service.net especially suspicious, beyond the vendor flags?</p>
            <div className="flex flex-col gap-2">
              {[
                "It has a .net TLD",
                "A domain registered only 4 days before the malware sample first appeared",
                "It's contacted by exactly one sample",
                "It has 'update' in the name",
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
          <p className="text-sm font-mono text-sage-400">Correct — legitimate infrastructure is rarely registered days before malware starts using it; freshly-registered domains tightly clustered with malware activity are a strong indicator of purpose-built attacker infrastructure. Flag: SAGE&#123;fr3shly_r3g1st3r3d_c2&#125;</p>
        )}
      </TaskShell>

      {/* Task 3 */}
      <TaskShell number={3} title="Turn Intel into Action" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">You now have two confirmed-malicious C2 domains from this investigation.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What should you do with this intelligence?</p>
            <div className="flex flex-col gap-2">
              {[
                "Nothing — VirusTotal already blocks it for everyone",
                "Block both domains and hunt your own environment's logs for any historical contact with them",
                "Just document it in a report for next quarter",
                "Report it only to the domain's registrar",
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
            Correct — proactively blocking the indicators prevents future contact, and retro-hunting your own DNS/proxy
            logs confirms whether you were already compromised before this investigation began. Flag: SAGE&#123;bl0ck_4nd_r3tr0_hunt&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;3m0t3t_52_0f_71_v3nd0rs&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;fr3shly_r3g1st3r3d_c2&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;bl0ck_4nd_r3tr0_hunt&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
