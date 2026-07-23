"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const HISTORY_TABLE = `Chrome History (urls table) — user j.morgan, 2026-04-02
  09:14:02  https://mail.corp.example.com/inbox
  09:15:41  https://mail.corp.example.com/message?id=88214
  09:16:03  https://docs-share-corp.info/invoice_Q1.html   <- typosquat domain
  09:16:09  https://docs-share-corp.info/verify-login.php
  09:16:44  https://mail.corp.example.com/inbox`;

const DOWNLOAD_TABLE = `Chrome Downloads (downloads table)
  09:16:05  invoice_Q1.html.exe   Source: docs-share-corp.info   State: Complete
  09:16:52  (no further downloads)`;

const LOGIN_DATA = `Chrome Login Data (logins table) — encrypted values decrypted via DPAPI
  origin_url: https://docs-share-corp.info/verify-login.php
  username_value: j.morgan@corp.example.com
  password_value: ********  (entered 09:16:22, matches corp SSO password reused)`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function BrowserForensicsClient({
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
    if (checkFlag(t1Answer, "SAGE{d0cs_sh4r3_c0rp_1nf0_typ0squ4t}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Which domain in the history looks like it's imitating a legitimate document-sharing service? Format as a flag.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "A file disguised with a double extension (.html.exe) was downloaded and likely executed") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Look closely at the downloaded file's full name.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Corporate credentials were entered into the phishing site and are now compromised — force a password reset immediately") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. What does the Login Data table reveal was actually typed into the fake page, and what must happen because of it?");
    }
  }

  return (
    <div className="space-y-6">
      {/* Task 1 */}
      <TaskShell number={1} title="Reconstruct the Browsing Timeline" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">
          A user reported their laptop &quot;acting weird&quot;. You pull their Chrome SQLite history database.
        </p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{HISTORY_TABLE}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Flag the suspicious domain visited between two legitimate email checks.</p>
            <div className="flex gap-2 max-w-lg">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — docs-share-corp.info mimics a legitimate document-sharing brand but is an unrelated, unfamiliar domain. Flag: SAGE&#123;d0cs_sh4r3_c0rp_1nf0_typ0squ4t&#125;</p>
        )}
      </TaskShell>

      {/* Task 2 */}
      <TaskShell number={2} title="Check the Downloads" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">The Chrome downloads table shows one file grabbed from that domain.</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{DOWNLOAD_TABLE}</pre>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What's suspicious about this download?</p>
            <div className="flex flex-col gap-2">
              {[
                "It's too large a file size for an invoice",
                "A file disguised with a double extension (.html.exe) was downloaded and likely executed",
                "It downloaded too quickly",
                "Nothing — invoices are commonly downloaded",
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
          <p className="text-sm font-mono text-sage-400">Correct — invoice_Q1.html.exe uses a double extension to look like a harmless HTML file while actually being a Windows executable. Flag: SAGE&#123;d0ubl3_3xt3ns10n_3x3c&#125;</p>
        )}
      </TaskShell>

      {/* Task 3 */}
      <TaskShell number={3} title="Assess the Credential Exposure" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-3">The browser's saved-password store reveals more:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap">{LOGIN_DATA}</pre>
        </div>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What does this tell you, and what's the required action?</p>
            <div className="flex flex-col gap-2">
              {[
                "Nothing of concern — Chrome always saves logins",
                "Corporate credentials were entered into the phishing site and are now compromised — force a password reset immediately",
                "The user has good password hygiene",
                "This proves the download was harmless",
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
            Correct — the user typed their real corporate SSO credentials into the fake "verify-login" page.
            Those credentials must be treated as compromised: force a reset immediately and check for any use
            of them elsewhere. Flag: SAGE&#123;cr3d3nt14ls_c0mpr0m1s3d_r3s3t&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;d0cs_sh4r3_c0rp_1nf0_typ0squ4t&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;d0ubl3_3xt3ns10n_3x3c&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;cr3d3nt14ls_c0mpr0m1s3d_r3s3t&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
