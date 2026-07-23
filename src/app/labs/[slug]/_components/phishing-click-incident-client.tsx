"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const EMAIL_HEADERS = `From: "IT Support" <helpdesk@corp-it-support.info>
Reply-To: recover@corp-it-support.info
To: k.reyes@acmecorp.example
Subject: URGENT: Your mailbox is 98% full — action required
Received: from mail-relay-09.corp-it-support.info (203.0.113.201)
          by mx.acmecorp.example; Tue, 12 May 2026 08:41:02 +0000

Body: "Click here to increase your mailbox quota before you lose access:
       hxxps://acmecorp-mailquota[.]info/upgrade?user=k.reyes"`;

const BROWSER_AND_PROCESS = `[Browser History] 08:42:15  hxxps://acmecorp-mailquota[.]info/upgrade?user=k.reyes
[Browser Download] 08:42:31  MailboxUpgradeTool.html.exe  Source: acmecorp-mailquota.info

[Sysmon Event ID 1] 08:42:52  Image: MailboxUpgradeTool.html.exe
                               CommandLine: powershell -W Hidden -Enc UwB0AGEAcgB0AC0AUAByAG8AYwBlAHMAcwAgAG0AYQBsAGkAYwBpAG8AdQBzAA==
                               ParentImage: MailboxUpgradeTool.html.exe

[Sysmon Event ID 3] 08:43:01  Process: powershell.exe
                               Dest: 198.51.100.77:8080
                               (C2 beacon established)`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function PhishingClickIncidentClient({
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
  const [t3Answer, setT3Answer] = useState("");
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
    if (checkFlag(t1Answer, "SAGE{corp_it_support_info_lookalike}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Compare the sender/Reply-To/Received domain against the real company domain (acmecorp.example) and flag the imitation domain.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "Clicking the link downloaded a disguised executable that launched an encoded PowerShell command establishing C2") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Walk through the sequence: what did the download do, and what did it launch?");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (checkFlag(t3Answer, "SAGE{198_51_100_77_c2_b34c0n}")) {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. For the IOC report, flag the final C2 destination this incident established contact with.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Task 1 */}
      <TaskShell number={1} title="Analyze the Phishing Email" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">
          <code className="text-amber-300">k.reyes@acmecorp.example</code> reports clicking a link in this email
          before realizing something was wrong.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{EMAIL_HEADERS}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Flag the domain impersonating the company's real IT support.</p>
            <div className="flex gap-2 max-w-lg">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — corp-it-support.info impersonates internal IT across the From, Reply-To, and Received headers, but is a completely unrelated external domain from the real acmecorp.example. Flag: SAGE&#123;c0rp_1t_supp0rt_1nf0_l00k4l1k3&#125;</p>
        )}
      </TaskShell>

      {/* Task 2 */}
      <TaskShell number={2} title="Trace the Execution Chain" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">Browser and endpoint telemetry from the moment k.reyes clicked the link:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{BROWSER_AND_PROCESS}</pre>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Summarize what happened, in order.</p>
            <div className="flex flex-col gap-2">
              {[
                "Nothing happened — the link was just a redirect",
                "Clicking the link downloaded a disguised executable that launched an encoded PowerShell command establishing C2",
                "The email itself contained a macro that ran automatically",
                "The user's password was captured via a fake login page",
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
          <p className="text-sm font-mono text-sage-400">Correct — the link served a double-extension executable (.html.exe), which on execution launched an encoded PowerShell one-liner that beaconed out to a C2 server. Flag: SAGE&#123;3x3c_ch41n_t0_c2&#125;</p>
        )}
      </TaskShell>

      {/* Task 3 */}
      <TaskShell number={3} title="File the IOC Report" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">
          You need to close out this incident with an IOC report so the SOC can block the infrastructure and
          sweep other endpoints for the same indicators.
        </p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Flag the final C2 destination (IP:port) to add to the block list.</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t3Answer} onChange={setT3Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t3Error && <p className="text-xs text-red-400 font-mono">{t3Error}</p>}
            <HintPanel labId={labId} stage="task_3" />
          </form>
        )}
        {done("task_3") && (
          <p className="text-sm font-mono text-sage-400">
            Correct — 198.51.100.77:8080 is the confirmed C2 beacon destination. Full IOC set for this incident:
            sender domain corp-it-support.info, phishing URL acmecorp-mailquota.info, dropped file
            MailboxUpgradeTool.html.exe, and C2 198.51.100.77:8080 — ready to block and hunt for across the fleet. Flag: SAGE&#123;198_51_100_77_c2_b34c0n&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete — Full Incident Closed</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Email —</span> <span className="text-sage-400">SAGE&#123;c0rp_1t_supp0rt_1nf0_l00k4l1k3&#125;</span></li>
            <li><span className="text-zinc-500">Execution —</span> <span className="text-sage-400">SAGE&#123;3x3c_ch41n_t0_c2&#125;</span></li>
            <li><span className="text-zinc-500">IOC Report —</span> <span className="text-sage-400">SAGE&#123;198_51_100_77_c2_b34c0n&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
