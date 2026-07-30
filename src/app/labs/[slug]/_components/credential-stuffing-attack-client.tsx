"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const LOGIN_ATTEMPTS = `Login attempts, last hour:
14,000 unique username/password pairs, each attempted exactly once
Password patterns match a public breach dump from "UnrelatedRetailerCo" (2024)
Success rate: 3.2% (accounts reusing the same password on this site)`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase().replace(/[01345789@$]/g, (c) => ({ "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "9": "g", "@": "a", "$": "s" }[c] ?? c));
  return strip(value) === strip(expected);
}

export function CredentialStuffingAttackClient({
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
    if (checkFlag(t1Answer, "SAGE{cr3d3nt14l_stuff1ng}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. These are known-valid credentials from a completely different company's breach.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "It targets many different accounts with pre-obtained, likely-valid credential pairs, rather than guessing passwords for one account repeatedly") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Compare the scope (one account vs. many) and the source of the passwords being tried.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Enforce multi-factor authentication, since it defeats stolen-but-correct password/username pairs") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Think about what still blocks a login even when the password itself is correct.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Name the Attack" unlocked completed={done("task_1")}>
        <p className="text-ink-2 text-sm mb-3">A surge of login attempts hits your site:</p>
        <div className="rounded-lg bg-surface-0 border border-edge p-4 mb-4">
          <pre className="font-mono text-xs text-warn whitespace-pre-wrap overflow-x-auto">{LOGIN_ATTEMPTS}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-ink-2 font-medium">What attack technique uses previously breached credentials from other sites against this login page?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-danger font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-ok">Correct — this is credential stuffing, reusing credentials leaked from a totally different site. Flag: SAGE&#123;cr3d3nt14l_stuff1ng&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Distinguish From Brute Force" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-ink-2 text-sm mb-4">A junior analyst calls this "just brute forcing."</p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-ink-2 font-medium">Why does this differ meaningfully from a traditional brute-force attack against one account?</p>
            <div className="flex flex-col gap-2">
              {[
                "It targets many different accounts with pre-obtained, likely-valid credential pairs, rather than guessing passwords for one account repeatedly",
                "There's no real difference — the two terms mean exactly the same thing",
                "Brute force always involves more total attempts than credential stuffing",
                "Credential stuffing only works against sites with weak password policies",
              ].map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="t2" value={opt} checked={t2Choice === opt} onChange={() => setT2Choice(opt)} className="accent-emerald-500" />
                  <span className="text-sm font-mono text-ink">{opt}</span>
                </label>
              ))}
            </div>
            <SubmitBtn label="Submit" />
            {t2Error && <p className="text-xs text-danger font-mono">{t2Error}</p>}
            <HintPanel labId={labId} stage="task_2" />
          </form>
        )}
        {done("task_2") && (
          <p className="text-sm font-mono text-ok">Correct — it spreads across many accounts using pre-obtained, likely-valid pairs, unlike guessing one account's password repeatedly. Flag: SAGE&#123;m4ny_4cc0unts_kn0wn_cr3ds&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Choose the Long-Term Fix" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-ink-2 text-sm mb-4">3.2% of the attempts succeeded because those users reused the same password here.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-ink-2 font-medium">What's the most effective long-term defense against credential stuffing specifically?</p>
            <div className="flex flex-col gap-2">
              {[
                "Enforce multi-factor authentication, since it defeats stolen-but-correct password/username pairs",
                "Ban all users from ever changing their password",
                "Increase the minimum password length to 6 characters",
                "Disable the login page entirely",
              ].map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="t3" value={opt} checked={t3Choice === opt} onChange={() => setT3Choice(opt)} className="accent-emerald-500" />
                  <span className="text-sm font-mono text-ink">{opt}</span>
                </label>
              ))}
            </div>
            <SubmitBtn label="Submit" />
            {t3Error && <p className="text-xs text-danger font-mono">{t3Error}</p>}
            <HintPanel labId={labId} stage="task_3" />
          </form>
        )}
        {done("task_3") && (
          <p className="text-sm font-mono text-ok">
            Correct — MFA defeats credential stuffing because a correct password alone is no longer enough to authenticate.
            Flag: SAGE&#123;mfa_d3f34ts_stuff1ng&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-ok-edge bg-ok-wash p-5 space-y-3">
          <h3 className="font-bold text-ok text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-ink-3">Task 1 —</span> <span className="text-ok">SAGE&#123;cr3d3nt14l_stuff1ng&#125;</span></li>
            <li><span className="text-ink-3">Task 2 —</span> <span className="text-ok">SAGE&#123;m4ny_4cc0unts_kn0wn_cr3ds&#125;</span></li>
            <li><span className="text-ink-3">Task 3 —</span> <span className="text-ok">SAGE&#123;mfa_d3f34ts_stuff1ng&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
