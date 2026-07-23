"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

type RdpRow = { id: number; time: string; user: string; ip: string; eventId: string; result: "Failed" | "Success" };

const RDP_LOG: RdpRow[] = [
  { id: 1, time: "22:04:11", user: "administrator", ip: "45.153.240.12", eventId: "4625", result: "Failed" },
  { id: 2, time: "22:04:14", user: "administrator", ip: "45.153.240.12", eventId: "4625", result: "Failed" },
  { id: 3, time: "22:04:16", user: "guest", ip: "45.153.240.12", eventId: "4625", result: "Failed" },
  { id: 4, time: "22:07:32", user: "helpdesk", ip: "45.153.240.12", eventId: "4625", result: "Failed" },
  { id: 5, time: "22:41:09", user: "helpdesk", ip: "45.153.240.12", eventId: "4624", result: "Success" },
];

const CONNECTION_LOG = `[Event ID 1149 — RDP Session Authentication]
  User: helpdesk
  Source Network Address: 45.153.240.12
  Time: 2026-05-03T22:41:09Z

[Event ID 4778 — Session Reconnected]
  Session Name: RDP-Tcp#3
  Account: helpdesk
  Client Name: DESKTOP-ATK09

[Sysmon Event ID 1 — ProcessCreate]
  Image: C:\\Windows\\System32\\net.exe
  CommandLine: net user backup_svc P@ssw0rd123! /add
  ParentImage: C:\\Windows\\System32\\mstsc.exe (via RDP session)`;

const GROUP_LOG = `[Event ID 4732 — Member Added to Security-Enabled Local Group]
  Group: Administrators
  Member Added: backup_svc
  Added By: helpdesk

[Event ID 4720 — User Account Created]
  New Account: backup_svc
  Created By: helpdesk
  Time: 2026-05-03T22:43:52Z`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function RdpAttackInvestigationClient({
  labId,
  completedStages: initial,
}: {
  labId: string;
  completedStages: string[];
}) {
  const [completed, setCompleted] = useState<string[]>(initial);
  const [t1Choice, setT1Choice] = useState("");
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
    if (t1Choice === "RDP brute force") {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Look at the account variety and the eventual success from the same source IP.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "Created a new local account") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Check the net.exe command line spawned from within the RDP session.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (checkFlag(t3Answer, "SAGE{b4ckup_svc_4dmin_p3rsist3nce}")) {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Name the account added to Administrators, in the flag format.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Task 1 */}
      <TaskShell number={1} title="Detect the Brute Force" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">
          Windows Security event logs on an internet-facing RDP jump box show repeated authentication attempts
          against different accounts from one source.
        </p>
        <div className="rounded-lg border border-white/8 mb-4 overflow-hidden">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-white/8 bg-zinc-900">
                <th className="px-3 py-2 text-left text-zinc-500">Time</th>
                <th className="px-3 py-2 text-left text-zinc-500">User</th>
                <th className="px-3 py-2 text-left text-zinc-500">Source IP</th>
                <th className="px-3 py-2 text-left text-zinc-500">Event</th>
                <th className="px-3 py-2 text-left text-zinc-500">Result</th>
              </tr>
            </thead>
            <tbody>
              {RDP_LOG.map((row) => (
                <tr key={row.id} className={`border-b border-white/5 ${row.result === "Success" ? "bg-green-950/30 text-green-300" : "text-red-300"}`}>
                  <td className="px-3 py-2">{row.time}</td>
                  <td className="px-3 py-2">{row.user}</td>
                  <td className="px-3 py-2">{row.ip}</td>
                  <td className="px-3 py-2">{row.eventId}</td>
                  <td className="px-3 py-2">{row.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-zinc-500 mb-4">1,204 total failed attempts (truncated above) across 6 accounts before the successful logon as helpdesk.</p>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What does this pattern represent?</p>
            <div className="flex flex-wrap gap-3">
              {["Normal remote work", "RDP brute force", "A licensing check", "Load balancer health check"].map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="t1" value={opt} checked={t1Choice === opt} onChange={() => setT1Choice(opt)} className="accent-emerald-500" />
                  <span className="text-sm font-mono text-zinc-200">{opt}</span>
                </label>
              ))}
            </div>
            <SubmitBtn label="Submit" />
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — 1,204 failures across multiple accounts from one IP, ending in success, is textbook RDP brute force. Flag: SAGE&#123;rdp_brut3_f0rc3&#125;</p>
        )}
      </TaskShell>

      {/* Task 2 */}
      <TaskShell number={2} title="Identify the Attacker's Action" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">
          Once inside as <code className="text-amber-300">helpdesk</code>, the attacker ran a command from within
          the RDP session.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{CONNECTION_LOG}</pre>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What did the attacker do?</p>
            <div className="flex flex-wrap gap-3">
              {["Deleted system logs", "Created a new local account", "Encrypted the disk", "Disabled the firewall"].map((opt) => (
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
          <p className="text-sm font-mono text-sage-400">Correct — `net user backup_svc ... /add` creates a new local account for later use. Flag: SAGE&#123;n3w_acc0unt_cr3at3d&#125;</p>
        )}
      </TaskShell>

      {/* Task 3 */}
      <TaskShell number={3} title="Confirm the Persistence" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-3">
          The new account wasn&apos;t left as a standard user — it was granted elevated rights immediately after creation.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{GROUP_LOG}</pre>
        </div>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Flag the account name and the group it was added to.</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t3Answer} onChange={setT3Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t3Error && <p className="text-xs text-red-400 font-mono">{t3Error}</p>}
            <HintPanel labId={labId} stage="task_3" />
          </form>
        )}
        {done("task_3") && (
          <p className="text-sm font-mono text-sage-400">Correct — backup_svc was added to the local Administrators group, giving the attacker durable admin-level persistence. Flag: SAGE&#123;b4ckup_svc_4dmin_p3rsist3nce&#125;</p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;rdp_brut3_f0rc3&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;n3w_acc0unt_cr3at3d&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;b4ckup_svc_4dmin_p3rsist3nce&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
