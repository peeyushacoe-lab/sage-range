"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const WHOIS = `Domain: secure-firstnatlonal-bank.com
Registered: 2026-07-21 (3 days ago)
Registrant: REDACTED FOR PRIVACY
Registrar: EarlyBird Domains LLC (flagged in 40+ prior phishing reports)
Nameservers: ns1.bulletproof-host.ru, ns2.bulletproof-host.ru`;

const PIVOT = `Two more domains found sharing the same nameservers:
- secure-firstnatlonal-login.com
- firstnatlonal-secureupdate.com
Both registered within the same 48-hour window as the original domain.`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function WhoisAnalysisClient({
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
    if (checkFlag(t1Answer, "SAGE{d0m41n_r3g1st3r3d_3_d4ys_4g0}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. A legitimate bank portal doesn't get freshly registered days ago.");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "The domains likely belong to the same actor or campaign, letting you pivot from one IOC to find more") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Think about what shared nameservers and a tight registration window suggest.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "WHOIS privacy services and spoofed registration details are trivial to use, so WHOIS alone is weak evidence without corroboration") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Consider how easy it is to hide or fake WHOIS registration details.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Read the WHOIS Record" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">A suspected phishing domain impersonating a bank:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{WHOIS}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What single WHOIS signal is the strongest indicator of malicious intent for a domain claiming to be a bank's login portal?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — a domain registered only 3 days ago claiming to be an established bank portal is highly suspicious. Flag: SAGE&#123;d0m41n_r3g1st3r3d_3_d4ys_4g0&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Pivot on Shared Infrastructure" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-3">A search on the nameservers turns up more domains:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-red-300 whitespace-pre-wrap overflow-x-auto">{PIVOT}</pre>
        </div>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What does shared infrastructure across multiple domains suggest?</p>
            <div className="flex flex-col gap-2">
              {[
                "The domains likely belong to the same actor or campaign, letting you pivot from one IOC to find more",
                "It's just a coincidence and not worth further investigation",
                "It proves the domains are all legitimate since they share a provider",
                "Nameserver overlap is irrelevant to attribution",
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
          <p className="text-sm font-mono text-sage-400">Correct — shared nameservers and a tight registration window let you pivot from one domain to the whole campaign. Flag: SAGE&#123;sh4r3d_1nfr4_p1v0t_c4mp41gn&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Know the Limits of WHOIS" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">A manager wants to name the responsible actor in the report based on WHOIS alone.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Why should WHOIS data alone never be the sole basis for attribution?</p>
            <div className="flex flex-col gap-2">
              {[
                "WHOIS privacy services and spoofed registration details are trivial to use, so WHOIS alone is weak evidence without corroboration",
                "WHOIS data is always 100% accurate and verified",
                "WHOIS records can never be queried for privacy-protected domains",
                "WHOIS only applies to domains, not IP infrastructure, so it's irrelevant here",
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
            Correct — spoofable, privacy-protected WHOIS data is weak evidence on its own and needs corroboration.
            Flag: SAGE&#123;wh01s_4l0n3_w34k_3v1d3nc3&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;d0m41n_r3g1st3r3d_3_d4ys_4g0&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;sh4r3d_1nfr4_p1v0t_c4mp41gn&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;wh01s_4l0n3_w34k_3v1d3nc3&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
