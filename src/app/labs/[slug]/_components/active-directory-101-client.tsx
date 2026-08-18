"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn, verifyStage, useRevealedFlags } from "./lab-ui";

const DOMAIN_USERS = [
  { name: "svc_sqlserver", desc: "SQL Server service account" },
  { name: "svc_backup",    desc: "Backup service account" },
  { name: "john.doe",      desc: "Domain user" },
  { name: "jane.smith",    desc: "Domain user" },
];

const KERBEROAST_OUTPUT = `$ GetUserSPNs.py domain.local/john.doe:Password1 -request

ServicePrincipalName              Name          MemberOf
--------------------------------  ------------  --------
svchost/db01.domain.com:1433      svc_sqlserver (vulnerable)

[-] Getting TGS for: svc_sqlserver/db01.domain.com:1433
[*] Hash: $krb5tgs$23$*svc_sqlserver$...SNIPPED...`;

const SECRETSDUMP_OUTPUT = `$ secretsdump.py domain.local/john.doe:Password1@dc01

[*] Dumping local SAM hashes
Administrator:500:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::

[*] Pass-the-Hash: use the NT hash directly without cracking`;

export function ActiveDirectory101Client({
  labId,
  completedStages: initial,
}: {
  labId: string;
  completedStages: string[];
}) {
  const [completed, setCompleted] = useState<string[]>(initial);
  const [revealed, addReveal] = useRevealedFlags(labId);
  const [t1Selected, setT1Selected] = useState<Set<string>>(new Set());
  const [t1Error, setT1Error] = useState("");
  const [t2Choice, setT2Choice] = useState("");
  const [t2Error, setT2Error] = useState("");
  const [t3Answer, setT3Answer] = useState("");
  const [t3Error, setT3Error] = useState("");

  const done = (s: string) => completed.includes(s);
  const allDone = done("task_1") && done("task_2") && done("task_3");

  function markDone(stage: string, reveal?: string) {
    setCompleted((p) => (p.includes(stage) ? p : [...p, stage]));
    addReveal(stage, reveal);
  }

  function toggleT1(name: string) {
    setT1Selected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function submitT1(e: React.FormEvent) {
    e.preventDefault();
    const hasRequired = t1Selected.has("svc_sqlserver") && t1Selected.has("svc_backup");
    const verdict = await verifyStage(labId, "task_1", [...t1Selected].join(", "));
    if (verdict.correct) {
      setT1Error("");
      markDone("task_1", verdict.reveal);
    } else if (!hasRequired) {
      setT1Error("Incorrect. Select both service accounts — look for the svc_ prefix pattern.");
    } else {
      setT1Error("Incorrect. john.doe and jane.smith are regular user accounts, not service accounts.");
    }
  }

  async function submitT2(e: React.FormEvent) {
    e.preventDefault();
    const verdict = await verifyStage(labId, "task_2", t2Choice);
    if (verdict.correct) {
      setT2Error("");
      markDone("task_2", verdict.reveal);
    } else {
      setT2Error("Incorrect. Look at the tool shown in the output — it requests Kerberos TGS tickets.");
    }
  }

  async function submitT3(e: React.FormEvent) {
    e.preventDefault();
    const verdict = await verifyStage(labId, "task_3", t3Answer);
    if (verdict.correct) {
      setT3Error("");
      markDone("task_3", verdict.reveal);
    } else {
      setT3Error("Incorrect. Think of the Impacket script that spawns a remote shell using NTLM hashes.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Task 1 — Domain Enumeration */}
      <TaskShell number={1} title="Domain Enumeration" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">
          Running <code className="font-mono text-amber-300">net user /domain</code> enumerates all accounts
          in the domain. Service accounts — identifiable by naming conventions like <code className="font-mono text-amber-300">svc_</code> —
          often have weak passwords and elevated privileges, making them prime Kerberoasting targets.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <p className="font-mono text-xs text-zinc-500 mb-2">$ net user /domain</p>
          <div className="space-y-1">
            {DOMAIN_USERS.map((u) => (
              <div key={u.name} className="flex gap-4 font-mono text-xs">
                <span className="text-amber-300 w-24 shrink-0">{u.name}</span>
                <span className="text-zinc-500">{u.desc}</span>
              </div>
            ))}
          </div>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Which accounts are likely service accounts? (select all that apply)</p>
            <div className="flex flex-col gap-2">
              {DOMAIN_USERS.map((u) => (
                <label key={u.name} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    value={u.name}
                    checked={t1Selected.has(u.name)}
                    onChange={() => toggleT1(u.name)}
                    className="accent-emerald-500"
                  />
                  <span className="text-sm font-mono text-zinc-200">{u.name}</span>
                  <span className="text-xs text-zinc-500">— {u.desc}</span>
                </label>
              ))}
            </div>
            <SubmitBtn label="Submit" />
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">
            Correct — svc_sqlserver and svc_backup are service accounts. Flag: {revealed.task_1 ?? "SAGE{…}"}
          </p>
        )}
      </TaskShell>

      {/* Task 2 — Kerberoasting */}
      <TaskShell number={2} title="Kerberoasting" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">
          Kerberoasting requests Kerberos TGS tickets for service accounts with registered SPNs.
          These tickets are encrypted with the service account&apos;s password hash and can be
          cracked offline without any privilege escalation.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{KERBEROAST_OUTPUT}</pre>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Which tool is used for Kerberoasting?</p>
            <div className="flex flex-col gap-2">
              {["mimikatz", "Impacket GetUserSPNs", "BloodHound", "CrackMapExec"].map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="t2choice"
                    value={opt}
                    checked={t2Choice === opt}
                    onChange={() => setT2Choice(opt)}
                    className="accent-emerald-500"
                  />
                  <span className="text-sm font-mono text-zinc-200">{opt}</span>
                </label>
              ))}
            </div>
            <SubmitBtn label="Submit" />
            {t2Error && <p className="text-xs text-red-400 font-mono">{t2Error}</p>}
          </form>
        )}
        {done("task_2") && (
          <p className="text-sm font-mono text-sage-400">
            Correct — Impacket&apos;s GetUserSPNs.py requests roastable TGS tickets. Flag: {revealed.task_2 ?? "SAGE{…}"}
          </p>
        )}
      </TaskShell>

      {/* Task 3 — Pass-the-Hash */}
      <TaskShell number={3} title="Pass-the-Hash" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-3">
          After extracting NTLM hashes with secretsdump, an attacker can authenticate as any user
          without knowing the plaintext password. NTLM authentication accepts the raw hash as a credential.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{SECRETSDUMP_OUTPUT}</pre>
        </div>
        <p className="text-xs text-zinc-500 mb-4">
          The NT hash <code className="font-mono text-amber-300">31d6cfe0d16ae931b73c59d7e0c089c0</code> can
          be passed directly to Impacket tools — no cracking required.
        </p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What Impacket script uses NTLM hashes to get a remote shell?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput
                value={t3Answer}
                onChange={setT3Answer}
                placeholder="script name..."
                className="flex-1"
              />
              <SubmitBtn label="Submit" />
            </div>
            {t3Error && <p className="text-xs text-red-400 font-mono">{t3Error}</p>}
          </form>
        )}
        {done("task_3") && (
          <p className="text-sm font-mono text-sage-400">
            Correct — psexec.py spawns a SYSTEM shell using NTLM pass-the-hash. Flag: {revealed.task_3 ?? "SAGE{…}"}
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">{revealed.task_1 ?? "SAGE{…}"}</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">{revealed.task_2 ?? "SAGE{…}"}</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">{revealed.task_3 ?? "SAGE{…}"}</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
