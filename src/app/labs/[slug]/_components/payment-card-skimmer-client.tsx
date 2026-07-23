"use client";

import { useState } from "react";
import { TaskShell, MonoInput, SubmitBtn } from "./lab-ui";
import { HintPanel } from "./hint-panel";

const INJECTED_SCRIPT = `Checkout page source diff:
+ <script src="https://cdn-analytics-secure.net/track.js"></script>
  <!-- Script only present on /checkout/payment, not on any other page -->
  <!-- track.js silently copies card number, expiry, and CVV fields on submit -->`;

function checkFlag(value: string, expected: string): boolean {
  const strip = (s: string) => s.trim().replace(/^SAGE\{/i, "").replace(/\}$/, "").toLowerCase();
  return strip(value) === strip(expected);
}

export function PaymentCardSkimmerClient({
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
    if (checkFlag(t1Answer, "SAGE{m4g3c4rt_style_sk1mm3r}")) {
      setT1Error("");
      void saveStage("task_1");
    } else {
      setT1Error("Incorrect. What's this class of web-based card-stealing JavaScript injection commonly known as?");
    }
  }

  function submitT2(e: React.FormEvent) {
    e.preventDefault();
    if (t2Choice === "It's designed to capture card data at the exact point customers enter it, avoiding pages that would never carry payment information") {
      setT2Error("");
      void saveStage("task_2");
    } else {
      setT2Error("Incorrect. Think about what data actually exists on this one page that doesn't exist anywhere else on the site.");
    }
  }

  function submitT3(e: React.FormEvent) {
    e.preventDefault();
    if (t3Choice === "A Content Security Policy restricting which script sources are allowed to load and execute on the payment page") {
      setT3Error("");
      void saveStage("task_3");
    } else {
      setT3Error("Incorrect. Think about a browser-enforced policy controlling which external scripts are even allowed to run.");
    }
  }

  return (
    <div className="space-y-6">
      <TaskShell number={1} title="Name the Attack Type" unlocked completed={done("task_1")}>
        <p className="text-zinc-300 text-sm mb-3">A diff of the checkout page's source reveals an injected script:</p>
        <div className="rounded-lg bg-zinc-950 border border-white/8 p-4 mb-4">
          <pre className="font-mono text-xs text-amber-300 whitespace-pre-wrap overflow-x-auto">{INJECTED_SCRIPT}</pre>
        </div>
        {!done("task_1") && (
          <form onSubmit={submitT1} className="space-y-2">
            <p className="text-sm text-zinc-300 font-medium">What is this type of web-based card-stealing attack commonly called?</p>
            <div className="flex gap-2 max-w-md">
              <MonoInput value={t1Answer} onChange={setT1Answer} placeholder="SAGE{...}" className="flex-1" />
              <SubmitBtn label="Submit" />
            </div>
            {t1Error && <p className="text-xs text-red-400 font-mono">{t1Error}</p>}
            <HintPanel labId={labId} stage="task_1" />
          </form>
        )}
        {done("task_1") && (
          <p className="text-sm font-mono text-sage-400">Correct — this is a Magecart-style web skimmer injected directly into the checkout page. Flag: SAGE&#123;m4g3c4rt_style_sk1mm3r&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={2} title="Understand the Targeting" unlocked={done("task_1")} completed={done("task_2")}>
        <p className="text-zinc-300 text-sm mb-4">The malicious script only exists on the payment page, nowhere else on the site.</p>
        {!done("task_2") && (
          <form onSubmit={submitT2} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Why does the malicious script specifically target only the payment page rather than the whole site?</p>
            <div className="flex flex-col gap-2">
              {[
                "It's designed to capture card data at the exact point customers enter it, avoiding pages that would never carry payment information",
                "It's a random placement with no strategic reason",
                "It's a performance optimization by the attacker to reduce load time",
                "The rest of the site was too well protected to inject into",
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
          <p className="text-sm font-mono text-sage-400">Correct — it targets exactly where card data is entered, ignoring pages with nothing valuable to steal. Flag: SAGE&#123;t4rg3ts_p4ym3nt_d4t4_p01nt&#125;</p>
        )}
      </TaskShell>

      <TaskShell number={3} title="Choose the Preventive Control" unlocked={done("task_2")} completed={done("task_3")}>
        <p className="text-zinc-300 text-sm mb-4">You need a control that would have stopped this before it ever ran in a customer's browser.</p>
        {!done("task_3") && (
          <form onSubmit={submitT3} className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">What control would have prevented this unauthorized script from ever loading in customers' browsers?</p>
            <div className="flex flex-col gap-2">
              {[
                "A Content Security Policy restricting which script sources are allowed to load and execute on the payment page",
                "A stronger admin panel password",
                "Antivirus software on the customer's own device",
                "Encrypting the database at rest",
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
            Correct — a strict CSP whitelisting allowed script sources would have blocked this unauthorized script from ever loading.
            Flag: SAGE&#123;csp_bl0cks_unauth0r1z3d_scr1pts&#125;
          </p>
        )}
      </TaskShell>

      {allDone && (
        <div className="rounded-lg border border-sage-500/40 bg-sage-500/5 p-5 space-y-3">
          <h3 className="font-bold text-sage-400 text-base">Room Complete</h3>
          <ul className="space-y-1 font-mono text-sm">
            <li><span className="text-zinc-500">Task 1 —</span> <span className="text-sage-400">SAGE&#123;m4g3c4rt_style_sk1mm3r&#125;</span></li>
            <li><span className="text-zinc-500">Task 2 —</span> <span className="text-sage-400">SAGE&#123;t4rg3ts_p4ym3nt_d4t4_p01nt&#125;</span></li>
            <li><span className="text-zinc-500">Task 3 —</span> <span className="text-sage-400">SAGE&#123;csp_bl0cks_unauth0r1z3d_scr1pts&#125;</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
