"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const SCAN_REPORT = `Submitted URL: hxxp://bit[.]ly/3xK9pLm
Final URL: hxxps://secure-0ffice365-login[.]com/verify
Page Title: "Office 365 - Sign in to your account"
Verdict: Malicious (92/100)
Certificate: Let's Encrypt, issued 2 days ago
Redirect Chain: bit.ly -> tinyurl-relay.info -> secure-0ffice365-login.com`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function UrlscanInvestigationClient({
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
    if (checkFlag(t1Answer, "SAGE{secur30ff1c3365l0g1n_0ff1c3365_1mp3rs0n4t10n}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. Flag the final landing domain and the brand it's impersonating.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "Multiple hops through URL shorteners before landing on a brand-new lookalike domain") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. The padlock and login form are red herrings — think about the redirect chain itself.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "Submit the domain for takedown/blocklisting and block it at the web proxy immediately") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. The page is live and actively harvesting credentials right now.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Read the Scan Report" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">A reported link comes back with this urlscan.io report:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{SCAN_REPORT}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">Flag the final landing domain and the brand it impersonates.</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — secure-0ffice365-login.com impersonates the Office 365 sign-in page. Flag: SAGE&#123;secur30ff1c3365l0g1n_0ff1c3365_1mp3rs0n4t10n&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Follow the Redirect Chain" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-4">The page has a valid HTTPS certificate and a normal-looking login form.</p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What single detail about this page is the strongest phishing indicator?</p>
            <div className="flex flex-col gap-2">
              {[
                "Multiple hops through URL shorteners before landing on a brand-new lookalike domain",
                "The page uses HTTPS",
                "The page has a login form",
                "The certificate is issued by Let's Encrypt",
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
          <p className="text-sm font-mono text-sage-400">Correct — layered redirects through a shortener and relay, landing on a two-day-old lookalike domain, is far more telling than the padlock. Flag: SAGE&#123;mult1_h0p_r3d1r3ct_ch41n&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Take Action" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">The page has a 92/100 malicious verdict and is live right now.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What should the SOC do right now?</p>
            <div className="flex flex-col gap-2">
              {[
                "Wait to see if more users click it before acting",
                "Submit the domain for takedown/blocklisting and block it at the web proxy immediately",
                "Just note it for the monthly phishing report",
                "Reply to the registrar's WHOIS contact and wait for a response",
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
            Correct — takedown and proxy blocking happen in parallel; a live, actively-harvesting page can't wait for a monthly report.
            Flag: SAGE&#123;t4k3d0wn_4nd_pr0xy_bl0ck&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;secur30ff1c3365l0g1n_0ff1c3365_1mp3rs0n4t10n&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;mult1_h0p_r3d1r3ct_ch41n&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;t4k3d0wn_4nd_pr0xy_bl0ck&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
